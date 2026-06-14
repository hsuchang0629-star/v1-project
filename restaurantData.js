// 模擬學餐店家與餐點資料 (以實體台北科大位置為主)
const restaurantData = [
  {
    id: "r1",
    name: "麗宴精緻自助餐",
    type: "便當",
    waitTime: 15, // 分鐘
    popularFood: "招牌雙拼便當",
    averagePrice: 85,
    description: "菜色豐富、經濟實惠的精緻自助餐，是午餐時段熱門的家常菜選擇。",
    lat: 25.04406888456704,
    lng: 121.53342716224758
  },
  {
    id: "r2",
    name: "喜歡你飯捲年糕",
    type: "點心",
    waitTime: 12, // 分鐘
    popularFood: "招牌飯捲與辣炒年糕",
    averagePrice: 75,
    description: "特色韓式乾拌麵與精緻飯捲，味道獨特，深受學生喜愛。",
    lat: 25.04406888456704,
    lng: 121.53342716224758
  },
  {
    id: "r3",
    name: "天津蔥抓餅",
    type: "點心",
    waitTime: 5, // 分鐘
    popularFood: "九層塔起司蛋抓餅",
    averagePrice: 55,
    description: "外皮酥脆、內層蓬鬆，搭配九層塔香氣十足，適合快速解決一餐。",
    lat: 25.04406888456704,
    lng: 121.53342716224758
  },
  {
    id: "r4",
    name: "摩斯漢堡",
    type: "速食",
    waitTime: 20, // 分鐘
    popularFood: "藜麥燒肉珍珠堡",
    averagePrice: 105,
    description: "日式連鎖漢堡，米漢堡現點現做，品質穩定，提供舒適的用餐環境。",
    lat: 25.04406888456704,
    lng: 121.53342716224758
  },
  {
    id: "r5",
    name: "泰式風味料理",
    type: "便當",
    waitTime: 12, // 分鐘
    popularFood: "泰式椒麻雞飯",
    averagePrice: 95,
    description: "酸辣開胃的泰式特色料理，椒麻雞外酥內嫩，搭配特調醬汁，是人氣熱門選擇。",
    lat: 25.04406888456704,
    lng: 121.53342716224758
  }
];

// 匯出資料，如果是瀏覽器直接載入，使用全域變數
if (typeof module !== 'undefined' && module.exports) {
  module.exports = restaurantData;
} else {
  window.restaurantData = restaurantData;
}
