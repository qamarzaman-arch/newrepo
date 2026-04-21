type Language = 'en' | 'es' | 'ar';

interface Translations {
  [key: string]: {
    [lang in Language]: string;
  };
}

const translations: Translations = {
  dashboard: { en: 'Dashboard', es: 'Tablero', ar: 'لوحة القيادة' },
  ledger: { en: 'Ledger', es: 'Libro Mayor', ar: 'دفتر الأستاذ' },
  kitchen: { en: 'Kitchen', es: 'Cocina', ar: 'مطبخ' },
  catalog: { en: 'Catalog', es: 'Catálogo', ar: 'كتالوج' },
  supply: { en: 'Supply', es: 'Suministro', ar: 'توفير' },
  customers: { en: 'Customers', es: 'Clientes', ar: 'العملاء' },
  personnel: { en: 'Personnel', es: 'Personal', ar: 'الموظفين' },
  intelligence: { en: 'Intelligence', es: 'Inteligencia', ar: 'ذكاء' },
  enterprise: { en: 'Enterprise', es: 'Empresa', ar: 'مشروع' },
  settings: { en: 'Settings', es: 'Ajustes', ar: 'إعدادات' },
  new_order: { en: 'New Order', es: 'Nueva Orden', ar: 'طلب جديد' },
  checkout: { en: 'Checkout', es: 'Caja', ar: 'الدفع' },
  total_value: { en: 'Total Value', es: 'Valor Total', ar: 'القيمة الإجمالية' },
  active_ledger: { en: 'Active Ledger', es: 'Libro Activo', ar: 'دفتر الأستاذ النشط' },
  fulfill: { en: 'Fulfill', es: 'Cumplir', ar: 'تلبية' },
  terminate_session: { en: 'Terminate Session', es: 'Terminar Sesión', ar: 'إنهاء الجلسة' },
};

export const t = (key: string, lang: Language = 'en'): string => {
  return translations[key]?.[lang] || key;
};

export default t;
