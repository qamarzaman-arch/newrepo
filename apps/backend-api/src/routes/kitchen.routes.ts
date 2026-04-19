import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../server';
import { authenticate, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { logger, sanitize } from '../utils/logger';
import { getWebSocketManager } from '../utils/websocket';

const router = Router();

// Validation schemas
const updateTicketStatusSchema = z.object({
  status: z.enum(['NEW', 'IN_PROGRESS', 'COMPLETED', 'DELAYED']),
});

const assignTicketSchema = z.object({
  station: z.string().optional(),
  assignedTo: z.string().uuid().optional(),
});

const delayTicketSchema = z.object({
  reason: z.string().min(1),
  estimatedDelay: z.number().positive().optional(),
});

// Get all KOT tickets with filters
router.get('/tickets', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { status, course, priority, station, startDate, endDate, page = 1, limit = 50 } = req.query;

    const where: any = {};

    if (status) where.status = status;
    if (course) where.course = course;
    if (priority) where.priority = priority;
    if (station) where.station = station;
    if (startDate || endDate) {
      where.orderedAt = {};
      if (startDate) where.orderedAt.gte = new Date(startDate as string);
      if (endDate) where.orderedAt.lte = new Date(endDate as string);
    }

    const [tickets, total] = await Promise.all([
      prisma.kotTicket.findMany({
        where,
        include: {
          order: {
            include: {
              items: {
                include: {
                  menuItem: true,
                },
              },
              table: true,
              customer: true,
            },
          },
        },
        orderBy: { orderedAt: 'desc' },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
      }),
      prisma.kotTicket.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        tickets,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get active tickets for kitchen display
router.get('/tickets/active', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);

    const tickets = await prisma.kotTicket.findMany({
      where: {
        OR: [
          {
            status: {
              in: ['NEW', 'IN_PROGRESS'],
            },
          },
          {
            status: 'COMPLETED',
            completedAt: {
              gte: twoHoursAgo,
            },
          },
        ],
      },
      include: {
        order: {
          include: {
            items: {
              include: {
                menuItem: true,
              },
            },
            table: true,
            customer: true,
          },
        },
      },
      orderBy: [
        { priority: 'desc' },
        { orderedAt: 'asc' },
      ],
    });

    res.json({
      success: true,
      data: { tickets },
    });
  } catch (error) {
    next(error);
  }
});

// Get kitchen stats
router.get('/stats', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [newTickets, inProgress, completed, delayed] = await Promise.all([
      prisma.kotTicket.count({
        where: { status: 'NEW' },
      }),
      prisma.kotTicket.count({
        where: { status: 'IN_PROGRESS' },
      }),
      prisma.kotTicket.count({
        where: {
          status: 'COMPLETED',
          orderedAt: { gte: today },
        },
      }),
      prisma.kotTicket.count({
        where: { status: 'DELAYED' },
      }),
    ]);

    // Calculate average prep time for completed tickets today
    const completedTickets = await prisma.kotTicket.findMany({
      where: {
        status: 'COMPLETED',
        orderedAt: { gte: today },
        completedAt: { not: null },
      },
      select: {
        orderedAt: true,
        completedAt: true,
      },
    });

    let avgPrepTimeMinutes = 0;
    if (completedTickets.length > 0) {
      const totalTime = completedTickets.reduce((sum, ticket) => {
        if (ticket.completedAt) {
          return sum + (ticket.completedAt.getTime() - ticket.orderedAt.getTime());
        }
        return sum;
      }, 0);
      avgPrepTimeMinutes = Math.round(totalTime / completedTickets.length / 60000);
    }

    res.json({
      success: true,
      data: {
        stats: {
          newTickets,
          inProgress,
          completed,
          delayed,
          avgPrepTimeMinutes,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get single ticket
router.get('/tickets/:id', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const ticket = await prisma.kotTicket.findUnique({
      where: { id: req.params.id },
      include: {
        order: {
          include: {
            items: {
              include: {
                menuItem: true,
              },
            },
            table: true,
            customer: true,
          },
        },
      },
    });

    if (!ticket) {
      throw new AppError('KOT ticket not found', 404);
    }

    res.json({
      success: true,
      data: { ticket },
    });
  } catch (error) {
    next(error);
  }
});

// Update ticket status
router.patch('/tickets/:id/status', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = updateTicketStatusSchema.parse(req.body);

    const ticket = await prisma.kotTicket.findUnique({
      where: { id: req.params.id },
      include: {
        order: true,
      },
    });

    if (!ticket) {
      throw new AppError('KOT ticket not found', 404);
    }

    const updatedTicket = await prisma.kotTicket.update({
      where: { id: req.params.id },
      data: {
        status: data.status,
        ...(data.status === 'IN_PROGRESS' && { startedAt: new Date() }),
        ...(data.status === 'COMPLETED' && { completedAt: new Date() }),
      },
      include: {
        order: {
          include: {
            items: {
              include: {
                menuItem: true,
              },
            },
            table: true,
          },
        },
      },
    });

    // Emit real-time event via WebSocket
    const ws = getWebSocketManager();
    if (data.status === 'COMPLETED') {
      ws.emitTicketCompleted(updatedTicket.id);
    } else {
      ws.emitTicketUpdated(updatedTicket.id, updatedTicket);
    }

    logger.info(`KOT ticket ${sanitize(ticket.ticketNumber)} status updated to ${data.status} by ${sanitize(req.user!.username)}`);

    res.json({
      success: true,
      data: { ticket: updatedTicket },
    });
  } catch (error) {
    next(error);
  }
});

// Assign ticket to station/staff
router.patch('/tickets/:id/assign', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = assignTicketSchema.parse(req.body);

    const ticket = await prisma.kotTicket.update({
      where: { id: req.params.id },
      data: {
        station: data.station,
        assignedTo: data.assignedTo,
      },
      include: {
        order: {
          include: {
            items: {
              include: {
                menuItem: true,
              },
            },
            table: true,
          },
        },
      },
    });

    // Emit real-time event via WebSocket
    const ws = getWebSocketManager();
    ws.emitTicketUpdated(ticket.id, ticket);

    res.json({
      success: true,
      data: { ticket },
    });
  } catch (error) {
    next(error);
  }
});

// Mark ticket as delayed
router.post('/tickets/:id/delay', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = delayTicketSchema.parse(req.body);

    const updatedTicket = await prisma.kotTicket.update({
      where: { id: req.params.id },
      data: {
        status: 'DELAYED',
      },
    });

    // Update notes separately to avoid circular reference
    await prisma.kotTicket.update({
      where: { id: req.params.id },
      data: {
        notes: `${updatedTicket.notes ? updatedTicket.notes + ' | ' : ''}Delayed: ${data.reason}${data.estimatedDelay ? ` (Est. ${data.estimatedDelay} min)` : ''}`,
      },
    });

    const ticket = await prisma.kotTicket.findUnique({
      where: { id: req.params.id },
      include: {
        order: {
          include: {
            items: {
              include: {
                menuItem: true,
              },
            },
            table: true,
          },
        },
      },
    });

    // Emit real-time event via WebSocket
    const ws = getWebSocketManager();
    ws.emitTicketUpdated(ticket.id, ticket);

    logger.info(`KOT ticket ${sanitize(ticket.ticketNumber)} marked as delayed: ${sanitize(data.reason)} by ${sanitize(req.user!.username)}`);

    res.json({
      success: true,
      data: { ticket },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
