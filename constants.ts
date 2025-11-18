import { Category, Transaction, Budget, User, Goal, GoalPriority, PaymentMethod, PlannedExpense, UserDetails, Currency, Language, LanguageSetting } from './types';

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'food', name: 'Еда', icon: 'fas fa-utensils', type: 'expense', subCategories: [
      {id: 'groceries', name: 'Продукты', icon: 'fas fa-shopping-basket'},
      {id: 'cafe', name: 'Кафе и рестораны', icon: 'fas fa-coffee'},
      {id: 'delivery', name: 'Доставка', icon: 'fas fa-box-open'},
  ]},
  { id: 'home', name: 'Дом', icon: 'fas fa-home', type: 'expense', subCategories: [
      {id: 'rent', name: 'Аренда', icon: 'fas fa-key'},
      {id: 'utilities', name: 'Коммунальные услуги', icon: 'fas fa-bolt'},
      {id: 'internet', name: 'Интернет и ТВ', icon: 'fas fa-wifi'},
      {id: 'maintenance', name: 'Обслуживание и ремонт', icon: 'fas fa-tools'},
      {id: 'furniture', name: 'Мебель и декор', icon: 'fas fa-couch'},
  ]},
  { id: 'transport', name: 'Транспорт', icon: 'fas fa-bus', type: 'expense', subCategories: [
      {id: 'public_transport', name: 'Общественный транспорт', icon: 'fas fa-subway'},
      {id: 'taxi', name: 'Такси', icon: 'fas fa-taxi'},
      {id: 'gasoline', name: 'Бензин', icon: 'fas fa-gas-pump'},
      {id: 'car_service', name: 'Обслуживание авто', icon: 'fas fa-car-crash'},
  ]},
  { id: 'entertainment', name: 'Досуг и развлечения', icon: 'fas fa-film', type: 'expense', subCategories: [
      {id: 'hobbies', name: 'Хобби', icon: 'fas fa-paint-brush'},
      {id: 'subscriptions', name: 'Подписки', icon: 'fas fa-stream'},
      {id: 'events', name: 'Кино и мероприятия', icon: 'fas fa-ticket-alt'},
      {id: 'travel', name: 'Путешествия', icon: 'fas fa-plane-departure'},
  ]},
  { id: 'health', name: 'Здоровье и красота', icon: 'fas fa-heartbeat', type: 'expense', subCategories: [
      {id: 'pharmacy', name: 'Аптеки', icon: 'fas fa-pills'},
      {id: 'doctor', name: 'Врачи', icon: 'fas fa-user-md'},
      {id: 'sport', name: 'Спорт', icon: 'fas fa-dumbbell'},
      {id: 'beauty', name: 'Уход и красота', icon: 'fas fa-cut'},
  ]},
  { id: 'gifts', name: 'Подарки', icon: 'fas fa-gift', type: 'expense' },
  { id: 'clothing', name: 'Одежда и обувь', icon: 'fas fa-tshirt', type: 'expense' },
  { id: 'education', name: 'Обучение', icon: 'fas fa-book-open', type: 'expense' },
  { id: 'pets', name: 'Питомцы', icon: 'fas fa-paw', type: 'expense' },
  { id: 'debt', name: 'Кредиты и долги', icon: 'fas fa-credit-card', type: 'expense' },
  { id: 'other', name: 'Другое', icon: 'fas fa-question-circle', type: 'expense' },
];

export const GOAL_CATEGORIES: Category[] = [
    { id: 'travel', name: 'Путешествия', icon: 'fas fa-plane', type: 'expense' },
    { id: 'major_purchase', name: 'Крупные покупки', icon: 'fas fa-car', type: 'expense' },
    { id: 'home_improvement', name: 'Ремонт и дом', icon: 'fas fa-hammer', type: 'expense' },
    { id: 'electronics', name: 'Техника', icon: 'fas fa-laptop', type: 'expense' },
    { id: 'appliances', name: 'Бытовая техника', icon: 'fas fa-blender', type: 'expense' },
    { id: 'sport_health', name: 'Спорт и здоровье', icon: 'fas fa-heartbeat', type: 'expense' },
    { id: 'education', name: 'Образование', icon: 'fas fa-graduation-cap', type: 'expense' },
    { id: 'financial', name: 'Финансовые цели', icon: 'fas fa-piggy-bank', type: 'expense' },
    { id: 'charity', name: 'Благотворительность', icon: 'fas fa-hand-holding-heart', type: 'expense' },
    { id: 'other', name: 'Другое', icon: 'fas fa-star', type: 'expense' },
];


export const INCOME_CATEGORIES: Category[] = [
    { id: 'salary', name: 'Зарплата', icon: 'fas fa-wallet', type: 'income' },
    { id: 'gift', name: 'Подарок', icon: 'fas fa-gift', type: 'income' },
    { id: 'side_hustle', name: 'Доп. доход', icon: 'fas fa-briefcase', type: 'income' },
    { id: 'other', name: 'Другое', icon: 'fas fa-ellipsis-h', type: 'income' },
];

export const MOCK_TRANSACTIONS: Transaction[] = [];

export const MOCK_BUDGET: Budget = {
  total: 5000000,
  byCategory: {
    'Еда': 40,
    'Дом': 30,
    'Транспорт': 10,
    'Досуг и развлечения': 10,
    'Здоровье и красота': 5,
    'Одежда и обувь': 5,
    'Другое': 0,
    'Подарки': 0,
    'Обучение': 0,
    'Кредиты и долги': 0,
    'Питомцы': 0,
  }
};

export const MOCK_PAYMENT_METHODS: PaymentMethod[] = [
    { id: 'cash', name: 'Наличные', type: 'Cash', owner: 'shared' }
];

export const MOCK_GOALS: Goal[] = [];
export const MOCK_PLANNED_EXPENSES: PlannedExpense[] = [];


export const GOAL_PRIORITY_DETAILS: { [key in GoalPriority]: { label: string; color: string; } } = {
  high: { label: 'Высокий', color: 'bg-red-500' },
  medium: { label: 'Средний', color: 'bg-yellow-500' },
  low: { label: 'Низкий', color: 'bg-green-500' },
};


export const USER_DETAILS: UserDetails = {
  Suren: { name: 'Suren', color: 'bg-blue-500', avatar: '👨🏻‍💻' },
  Alena: { name: 'Alena', color: 'bg-pink-500', avatar: '👩🏻‍🎨' },
  shared: { name: 'Общие', color: 'bg-indigo-500', avatar: '👨‍👩‍👧' },
};

export const DEMO_USER_DETAILS: UserDetails = {
  Suren: { name: 'Тимур Маликов', color: 'bg-blue-500', avatar: '👨🏻‍💻' },
  Alena: { name: 'Камилла Абдурашидова', color: 'bg-pink-500', avatar: '👩🏻‍🎨' },
  shared: { name: 'Семья', color: 'bg-indigo-500', avatar: '👨‍👩‍👧' },
};

// --- DEMO DATA GENERATION ---

const generateMonthlyTransactions = (monthOffset: number): Transaction[] => {
    const date = new Date();
    date.setMonth(date.getMonth() - monthOffset);
    
    return [
        // Expenses
        { id: `tx1-${monthOffset}`, description: 'Продукты в Korzinka', amount: Math.round(350000 * (1 + Math.random()*0.2)), category: 'Еда', subCategory: 'Продукты', date: new Date(date.getFullYear(), date.getMonth(), 2).toISOString(), user: 'Suren', priority: 'must-have', type: 'expense', paymentMethodId: 'card1' },
        { id: `tx2-${monthOffset}`, description: 'Обед в Yapona Mama', amount: Math.round(250000 * (1 + Math.random()*0.2)), category: 'Еда', subCategory: 'Кафе и рестораны', date: new Date(date.getFullYear(), date.getMonth(), 3).toISOString(), user: 'Alena', priority: 'nice-to-have', type: 'expense', paymentMethodId: 'card2' },
        { id: `tx3-${monthOffset}`, description: 'Такси Yandex Go', amount: Math.round(35000 * (1 + Math.random()*0.2)), category: 'Транспорт', subCategory: 'Такси', date: new Date(date.getFullYear(), date.getMonth(), 4).toISOString(), user: 'shared', priority: 'nice-to-have', type: 'expense', paymentMethodId: 'cash' },
        { id: `tx4-${monthOffset}`, description: 'Подписка Netflix', amount: 120000, category: 'Досуг и развлечения', subCategory: 'Подписки', date: new Date(date.getFullYear(), date.getMonth(), 5).toISOString(), user: 'shared', priority: 'nice-to-have', type: 'expense', paymentMethodId: 'card1' },
        { id: `tx5-${monthOffset}`, description: 'Коммунальные услуги', amount: Math.round(450000 * (1 + Math.random()*0.1)), category: 'Дом', subCategory: 'Коммунальные услуги', date: new Date(date.getFullYear(), date.getMonth(), 6).toISOString(), user: 'shared', priority: 'must-have', type: 'expense', paymentMethodId: 'bank1' },
        { id: `tx6-${monthOffset}`, description: 'Спортзал', amount: 500000, category: 'Здоровье и красота', subCategory: 'Спорт', date: new Date(date.getFullYear(), date.getMonth(), 15).toISOString(), user: 'Suren', priority: 'nice-to-have', type: 'expense', paymentMethodId: 'card1' },
        { id: `tx7-${monthOffset}`, description: 'Покупка одежды', amount: 850000, category: 'Одежда и обувь', date: new Date(date.getFullYear(), date.getMonth(), 20).toISOString(), user: 'Alena', priority: 'nice-to-have', type: 'expense', paymentMethodId: 'card2' },
        // Incomes
        { id: `inc1-${monthOffset}`, description: 'Зарплата (Тимур)', amount: 8000000, category: 'Зарплата', date: new Date(date.getFullYear(), date.getMonth(), 1).toISOString(), user: 'Suren', priority: 'must-have', type: 'income', paymentMethodId: 'card1' },
        { id: `inc2-${monthOffset}`, description: 'Зарплата (Камилла)', amount: 6500000, category: 'Зарплата', date: new Date(date.getFullYear(), date.getMonth(), 1).toISOString(), user: 'Alena', priority: 'must-have', type: 'income', paymentMethodId: 'card2' },
        { id: `inc3-${monthOffset}`, description: 'Фриланс проект', amount: 1500000, category: 'Доп. доход', date: new Date(date.getFullYear(), date.getMonth(), 10).toISOString(), user: 'Alena', priority: 'must-have', type: 'income', paymentMethodId: 'card2' },
    ];
}

export const DEMO_DATA = {
  transactions: [
      ...generateMonthlyTransactions(0),
      ...generateMonthlyTransactions(1),
      ...generateMonthlyTransactions(2),
  ],
  budget: {
    total: 10000000,
    byCategory: { 'Еда': 30, 'Дом': 25, 'Транспорт': 10, 'Досуг и развлечения': 15, 'Здоровье и красота': 10, 'Одежда и обувь': 10 }
  },
  goals: [
    { id: 'goal1', description: 'Поездка в Дубай', amount: 15000000, priority: 'high', category: 'Путешествия', user: 'shared' },
    { id: 'goal2', description: 'Новый iPhone', amount: 12000000, priority: 'medium', category: 'Техника', user: 'Alena' },
  ],
  plannedExpenses: [
      { id: 'plan1', description: 'Аренда квартиры', amount: 4000000, category: 'Дом', dueDate: new Date(new Date().setDate(28)).toISOString(), user: 'shared' },
  ],
  paymentMethods: [
    { id: 'card1', name: 'Visa Gold', type: 'Card', owner: 'Suren' },
    { id: 'card2', name: 'Humo', type: 'Card', owner: 'Alena' },
    { id: 'bank1', name: 'Сберегательный счет', type: 'Bank Account', owner: 'shared' },
    { id: 'cash', name: 'Наличные', type: 'Cash', owner: 'shared' },
  ],
  expenseCategories: DEFAULT_CATEGORIES,
  incomeCategories: INCOME_CATEGORIES,
};

export const LANGUAGES: LanguageSetting[] = [
    { code: 'ru', name: 'Русский' },
    { code: 'en', name: 'English' },
    { code: 'uz', name: 'O\'zbekcha' },
    { code: 'es', name: 'Español' },
    { code: 'de', name: 'Deutsch' },
    { code: 'fr', name: 'Français' },
    { code: 'zh', name: '中文' },
    { code: 'ja', name: '日本語' },
    { code: 'ko', name: '한국어' },
    { code: 'pt', name: 'Português' },
];

export const CURRENCIES: Currency[] = [
    { code: 'SUM', name: 'Узбекский сум' },
    { code: 'USD', name: 'Доллар США' },
    { code: 'EUR', name: 'Евро' },
    { code: 'RUB', name: 'Российский рубль' },
    { code: 'KZT', name: 'Казахстанский тенге' },
    { code: 'GBP', name: 'Британский фунт' },
    { code: 'CNY', name: 'Китайский юань' },
    { code: 'JPY', name: 'Японская иена' },
    { code: 'KRW', name: 'Южнокорейская вона' },
    { code: 'BRL', name: 'Бразильский реал' },
    { code: 'AUD', name: 'Австралийский доллар' },
    { code: 'CAD', name: 'Канадский доллар' },
];