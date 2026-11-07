export const catalog = {
  demo: true,
  currency: 'YER',
  products: [
    {
      id: 'classic-coat', category: 'coats', name: 'الكوت الكلاسيكي',
      description: 'قصّة مستقيمة وياقة كلاسيكية بتفاصيل هادئة.',
      image: '/images/classic-coats.jpg', color: 'أسود', price: 28000,
      variants: [
        { id: 'm', name: 'M', stock: 8 }, { id: 'l', name: 'L', stock: 10 },
        { id: 'xl', name: 'XL', stock: 6 },
      ],
    },
    {
      id: 'embroidered-shawl', category: 'shawls', name: 'الشال المزخرف',
      description: 'نقشة ملوّنة على أرضية عاجية، مع حواف مطرّزة.',
      image: '/images/patterned-shawls.jpg', color: 'عاجي', price: 16000,
      variants: [{ id: 'one', name: 'مقاس موحّد', stock: 12 }],
    },
    {
      id: 'color-coat', category: 'coats', name: 'الكوت النيلي',
      description: 'لون نيلي بارز مع ياقة وأزرار بتنسيق كلاسيكي.',
      image: '/images/colored-coats.jpg', color: 'نيلي', price: 29500,
      variants: [
        { id: 'm', name: 'M', stock: 6 }, { id: 'l', name: 'L', stock: 9 },
        { id: 'xl', name: 'XL', stock: 5 },
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
