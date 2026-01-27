export type AttributeTemplate = {
  id: string;
  name: string;
  options: { value: string; price: number }[];
};

export const attributeTemplates: AttributeTemplate[] = [
  {
    id: 'template-size',
    name: '尺寸',
    options: [
      { value: '小', price: 0 },
      { value: '中', price: 10 },
      { value: '大', price: 20 },
    ],
  },
  {
    id: 'template-color',
    name: '顏色',
    options: [
      { value: '黑色', price: 0 },
      { value: '白色', price: 0 },
      { value: '紅色', price: 0 },
    ],
  },
  {
    id: 'template-capacity',
    name: '容量',
    options: [
      { value: '350ml', price: 0 },
      { value: '500ml', price: 15 },
      { value: '750ml', price: 25 },
    ],
  },
  {
    id: 'template-sweetness',
    name: '甜度',
    options: [
        { value: '正常糖', price: 0 },
        { value: '少糖', price: 0 },
        { value: '半糖', price: 0 },
        { value: '微糖', price: 0 },
        { value: '無糖', price: 0 },
    ]
  },
  {
      id: 'template-ice',
      name: '冰塊',
      options: [
          { value: '正常冰', price: 0 },
          { value: '少冰', price: 0 },
          { value: '微冰', price: 0 },
          { value: '去冰', price: 0 },
      ]
  }
];
