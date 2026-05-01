import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { logger, sanitize } from '../utils/logger';
import { getWebSocketManager } from '../utils/websocket';
import { parsePagination } from '../utils/parsePagination';

const router = Router();

// QA A32: enforce a forward-only state machine. Stations can move through
// receive → prep → ready → done, but not jump backwards (e.g. READY → RECEIVED)
// which would invalidate downstream displays.
const KOT_TRANSITIONS: Record<string, string[]> = {
  NEW:        ['RECEIVED', 'PREPARING', 'CANCELLED'],
  RECEIVED:   ['PREPARING', 'DELAYED', 'CANCELLED'],
  PREPARING:  ['READY', 'DELAYED', 'CANCELLED'],
  DELAYED:    ['PREPARING', 'READY', 'CANCELLED'],
  READY:      ['SERVED', 'DISPATCHED', 'COMPLETED'],
  SERVED:     ['COMPLETED'],
  DISPATCHED: ['COMPLETED'],
  COMPLETED:  [],
  CANCELLED:  [],
};

// Validation schemas
const updateTicketStatusSchema = z.object({
  status: z.enum(['NEW', 'RECEIVED', 'PREPARING', 'READY', 'SERVED', 'DISPATCHED', 'COMPLETED', 'DELAYED', 'CANCELLED']),
  // QA A31, B21: optional caller-supplied version for optimistic-lock. If
  // provided, the update only proceeds when version matches; otherwise we
  // return 409 so the caller can refetch.
  version: z.number().int().nonnegative().optional(),
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
    const { status, course, priority, station, startDate, endDate } = req.query;
    const { page, limit } = parsePagination(req.query);

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
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.kotTicket.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        tickets,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
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
              in: ['NEW', 'RECEIVED', 'PREPARING', 'READY'],
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

// Reprint KOT ticket
router.post('/tickets/:id/reprint', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
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

    // Log reprint action
    logger.info(`KOT ticket ${sanitize(ticket.ticketNumber)} reprinted by ${sanitize(req.user!.username)}`);

    res.json({
      success: true,
      data: { ticket },
    });
  } catch (error) {
    next(error);
  }
});

// Get delayed orders
router.get('/tickets/delayed', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const DELAY_THRESHOLD_MINUTES = 15;
    const thresholdDate = new Date(Date.now() - DELAY_THRESHOLD_MINUTES * 60 * 1000);

    const delayedTickets = await prisma.kotTicket.findMany({
      where: {
        status: {
          in: ['NEW', 'RECEIVED', 'PREPARING'],
        },
        orderedAt: {
          lt: thresholdDate,
        },
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
      orderBy: {
        orderedAt: 'asc',
      },
    });

    res.json({
      success: true,
      data: {
        delayedTickets,
        count: delayedTickets.length,
        thresholdMinutes: DELAY_THRESHOLD_MINUTES,
      },
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
        where: { status: 'PREPARING' },
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
      include: { order: true },
    });

    if (!ticket) {
      throw new AppError('KOT ticket not found', 404);
    }

    // QA A32: refuse invalid backwards transitions (READY → RECEIVED, etc.).
    const allowed = KOT_TRANSITIONS[ticket.status] ?? [];
    if (ticket.status !== data.status && !allowed.includes(data.status)) {
      throw new AppError(
        `Cannot transition KOT from ${ticket.status} to ${data.status}. Allowed: ${allowed.join(', ') || 'none'}`,
        400
      );
    }

    // QA A31, B21: optimistic-lock via the new `version` column. The
    // updateMany either bumps version+writes status atomically, or fails (count=0)
    // because someone else moved the ticket first.
    const expectedVersion = data.version ?? (ticket as any).version ?? 0;
    const bumped = await prisma.kotTicket.updateMany({
      where: { id: req.params.id, version: expectedVersion },
      data: {
        status: data.status,
        version: expectedVersion + 1,
        ...(data.status === 'PREPARING' && { startedAt: new Date() }),
        ...(data.status === 'COMPLETED' && { completedAt: new Date() }),
      },
    });

    if (bumped.count !== 1) {
      throw new AppError('Ticket was modified by another user. Please refresh and retry.', 409);
    }

    const updatedTicket = await prisma.kotTicket.findUnique({
      where: { id: req.params.id },
      include: {
        order: {
          include: {
            items: { include: { menuItem: true } },
            table: true,
          },
        },
      },
    });
    if (!updatedTicket) throw new AppError('Ticket vanished after update', 500);

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

    // QA A34: persist delay reason in dedicated columns rather than free-text notes.
    await prisma.kotTicket.update({
      where: { id: req.params.id },
      data: {
        status: 'DELAYED',
        delayReason: data.reason + (data.estimatedDelay ? ` (Est. ${data.estimatedDelay} min)` : ''),
        delayedAt: new Date(),
      },
    });

    const ticket = await prisma.kotTicket.findUnique({
      where: { id: req.params.id },
      include: {
        order: {
          include: {
            items: { include: { menuItem: true } },
            table: true,
          },
        },
      },
    });
    if (!ticket) throw new AppError('KOT ticket not found', 404);

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

// NEW: Root /kitchen - returns active tickets (public-ish for kitchen screen)
router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);

    const tickets = await prisma.kotTicket.findMany({
      where: {
        OR: [
          {
            status: {
              in: ['NEW', 'RECEIVED', 'PREPARING'],
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

export default router;
