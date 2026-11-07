export const catalog = {
  demo: true,
  currency: 'YER',
  products: [
    {
      id: 'classic-coat', category: 'coats', name: 'الكوت الكلاسيكي',
      description: 'ياقة واضحة وقصّة مستقيمة. جرّب الأسود، أو درجة رملية تُظهر خطوط القصّة.',
      image: '/images/classic-coats.jpg', color: 'أسود', price: 28000,
      colors: [
        { id: 'black', name: 'أسود', swatch: '#25252a' },
        { id: 'sand', name: 'رملي', swatch: '#c6b79d' },
      ],
      variants: [
        { id: 'm', name: 'M', stock: 8, colorId: 'black' },
        { id: 'l', name: 'L', stock: 10, colorId: 'black' },
        { id: 'xl', name: 'XL', stock: 6, colorId: 'black' },
        { id: 'sand-m', name: 'M', stock: 4, colorId: 'sand' },
        { id: 'sand-l', name: 'L', stock: 6, colorId: 'sand' },
      ],
    },
    {
      id: 'embroidered-shawl', category: 'shawls', name: 'الشال المزخرف',
      description: 'نقشة ملوّنة على أرضية عاجية، مع حواف مطرّزة.',
      image: '/images/patterned-shawls.jpg', color: 'عاجي', price: 16000,
      variants: [{ id: 'one', name: 'مقاس موحّد', stock: 12 }],
    },
    {
      id: 'color-coat', category: 'coats', name: 'كوت الألوان',
      description: 'قصّة كلاسيكية بدرجتين واضحتين على المِشجب، النيلي والبرقوقي.',
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
