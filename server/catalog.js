export const catalog = {
  demo: true,
  currency: 'YER',
  products: [
    {
      id: 'classic-coat', category: 'coats', name: 'الكوت الكلاسيكي',
      description: 'كوت سادة بياقة واضحة وقصّة مستقيمة. استكشف درجاته كما تظهر على مِشجب كوتشال.',
      image: '/images/classic-coats.jpg', imageSize: [600, 505], color: 'أسود', price: 28000,
      colors: [
        { id: 'black', name: 'أسود', swatch: '#25252a', crop: [8, 124, 244, 335] },
        { id: 'sand', name: 'رملي', swatch: '#c6b79d', crop: [237, 128, 222, 320] },
        { id: 'taupe', name: 'بني رمادي', swatch: '#77675b', crop: [345, 120, 186, 310] },
        { id: 'light-grey', name: 'رمادي فاتح', swatch: '#a69e90', crop: [435, 105, 165, 300] },
      ],
      variants: [
        { id: 'm', name: 'M', stock: 8, colorId: 'black' },
        { id: 'l', name: 'L', stock: 10, colorId: 'black' },
        { id: 'xl', name: 'XL', stock: 6, colorId: 'black' },
        { id: 'sand-m', name: 'M', stock: 4, colorId: 'sand' },
        { id: 'sand-l', name: 'L', stock: 6, colorId: 'sand' },
        { id: 'taupe-m', name: 'M', stock: 5, colorId: 'taupe' },
        { id: 'taupe-l', name: 'L', stock: 4, colorId: 'taupe' },
        { id: 'light-grey-l', name: 'L', stock: 4, colorId: 'light-grey' },
        { id: 'light-grey-xl', name: 'XL', stock: 3, colorId: 'light-grey' },
      ],
    },
    {
      id: 'embroidered-shawl', category: 'shawls', name: 'الشال المزخرف',
      description: 'أرضية عاجية ونقشات ملوّنة تتوزع على الحواف.',
      image: '/images/patterned-shawls.jpg', color: 'عاجي', price: 16000,
      variants: [{ id: 'one', name: 'مقاس موحّد', stock: 12 }],
    },
    {
      id: 'color-coat', category: 'coats', name: 'كوت الألوان',
      description: 'اختر النيلي أو البرقوقي من الأكوات الظاهرة بجوار الشيلان المزخرفة في صورة المعرض.',
      image: '/images/colored-coats.jpg', color: 'نيلي', price: 29500,
      colors: [
        { id: 'indigo', name: 'نيلي', swatch: '#3c5194' },
        { id: 'plum', name: 'برقوقي', swatch: '#523c51' },
      ],
      variants: [
        { id: 'm', name: 'M', stock: 6, colorId: 'indigo' },
        { id: 'l', name: 'L', stock: 9, colorId: 'indigo' },
        { id: 'xl', name: 'XL', stock: 5, colorId: 'indigo' },
        { id: 'plum-l', name: 'L', stock: 5, colorId: 'plum' },
        { id: 'plum-xl', name: 'XL', stock: 3, colorId: 'plum' },
      ],
    },
    {
      id: 'occasion-coat', category: 'coats', name: 'كوت المناسبات',
      description: 'كوت عنّابي يُنسّق مع قميص فاتح لإطلالة المناسبات.',
      image: '/images/coatshal-atelier.jpg', color: 'عنّابي', price: 34000,
      variants: [
        { id: 'm', name: 'M', stock: 4 }, { id: 'l', name: 'L', stock: 7 },
        { id: 'xl', name: 'XL', stock: 4 },
      ],
    },
  ],
  zones: [
    { id: 'sanaa', name: 'داخل صنعاء', fee: 1500 },
    { id: 'other', name: 'محافظات أخرى', fee: 3500 },
  ],
  payments: [
    { id: 'bank', name: 'تحويل بنكي' },
    { id: 'wallet', name: 'محفظة إلكترونية' },
  ],
};
