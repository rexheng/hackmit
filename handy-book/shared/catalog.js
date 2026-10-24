/* Stands in for the MongoDB manuals + parts collection. */
window.Handy = {
  store: "mongodb",
  bikes: [
    {
      id: "yamaha-xt250-2018",
      name: "Yamaha XT250",
      years: "2018–2024",
      kind: "Dual-sport",
      aka: ["xt250", "xt 250", "yamaha xt", "yamaha", "xt"],
      manual: { title: "XT250 Owner’s Manual", file: "XT250_2018.pdf", pages: 98 },
      jobs: [
        {
          id: "clutch",
          name: "Clutch feels loose",
          page: 47,
          figure: "6-4",
          chapter: "Controls",
          parts: [
            { name: "Clutch cable", sku: "5XT-26335-00", price: 24.5, store: "RevZilla", days: 2, ship: 6.99 },
            { name: "Cable lube", sku: "MAX-CL-1", price: 7.95, store: "Local shop", days: 0, ship: 0 }
          ]
        },
        {
          id: "brakes",
          name: "Brakes squeal",
          page: 62,
          figure: "7-2",
          chapter: "Brakes",
          parts: [
            { name: "Front brake pads", sku: "5XT-W0045-00", price: 32, store: "Partzilla", days: 3, ship: 8.5 },
            { name: "Brake cleaner", sku: "CRC-05050", price: 6.49, store: "Local shop", days: 0, ship: 0 }
          ]
        },
        {
          id: "start",
          name: "Won’t start",
          page: 31,
          figure: "4-1",
          chapter: "Engine",
          parts: [
            { name: "Spark plug NGK CR7HSA", sku: "CR7HSA", price: 5.8, store: "Local shop", days: 0, ship: 0 }
          ]
        }
      ]
    },
    {
      id: "honda-cg125-2018",
      name: "Honda CG125",
      years: "2018–2022",
      kind: "Commuter",
      aka: ["cg125", "cg 125", "honda cg", "honda"],
      manual: { title: "CG125 Shop Manual", file: "CG125_2018.pdf", pages: 142 },
      jobs: [
        {
          id: "clutch",
          name: "Clutch feels loose",
          page: 54,
          figure: "5-3",
          chapter: "Clutch",
          parts: [
            { name: "Clutch cable", sku: "22870-KRM-900", price: 18.4, store: "David Silver", days: 5, ship: 9.5 }
          ]
        },
        {
          id: "brakes",
          name: "Brakes squeal",
          page: 71,
          figure: "8-1",
          chapter: "Brakes",
          parts: [
            { name: "Front brake shoes", sku: "06450-KRM-850", price: 21, store: "CMSNL", days: 6, ship: 11.2 }
          ]
        },
        {
          id: "start",
          name: "Won’t start",
          page: 28,
          figure: "3-2",
          chapter: "Ignition",
          parts: [
            { name: "Spark plug NGK C7HSA", sku: "C7HSA", price: 4.5, store: "Local shop", days: 0, ship: 0 }
          ]
        }
      ]
    },
    {
      id: "kawasaki-klx230-2020",
      name: "Kawasaki KLX230",
      years: "2020–2025",
      kind: "Dual-sport",
      aka: ["klx230", "klx 230", "kawasaki klx", "kawasaki", "klx"],
      manual: { title: "KLX230 Owner’s Manual", file: "KLX230_2020.pdf", pages: 186 },
      jobs: [
        {
          id: "clutch",
          name: "Clutch feels loose",
          page: 88,
          figure: "9-6",
          chapter: "Clutch",
          parts: [
            { name: "Clutch cable", sku: "54012-0749", price: 29.95, store: "Kawasaki", days: 4, ship: 10 },
            { name: "Cable lube", sku: "MAX-CL-1", price: 7.95, store: "Local shop", days: 0, ship: 0 }
          ]
        },
        {
          id: "brakes",
          name: "Brakes squeal",
          page: 104,
          figure: "11-2",
          chapter: "Brakes",
          parts: [
            { name: "Front brake pads", sku: "43082-0124", price: 38.4, store: "RevZilla", days: 2, ship: 6.99 }
          ]
        },
        {
          id: "start",
          name: "Won’t start",
          page: 52,
          figure: "6-1",
          chapter: "Fuel & ignition",
          parts: [
            { name: "Spark plug NGK CPR8EA-9", sku: "CPR8EA-9", price: 8.2, store: "Local shop", days: 0, ship: 0 }
          ]
        }
      ]
    }
  ],

  money(n) {
    return (n === 0 ? "$0" : "$" + n.toFixed(2));
  },

  shipLabel(p) {
    if (p.days === 0) return "Today · pickup";
    if (p.days === 1) return "Tomorrow · " + this.money(p.ship);
    return p.days + " days · " + this.money(p.ship);
  },

  search(q) {
    q = String(q || "").toLowerCase().replace(/\s+/g, " ").trim();
    if (!q) return [];
    return this.bikes.filter(function (b) {
      if (b.name.toLowerCase().indexOf(q) !== -1) return true;
      return b.aka.some(function (a) { return a.indexOf(q) !== -1 || q.indexOf(a) !== -1; });
    });
  },

  bike(id) {
    return this.bikes.find(function (b) { return b.id === id; }) || null;
  },

  fromPhoto() {
    return this.bike("yamaha-xt250-2018");
  },

  job(bike, jobId) {
    return bike.jobs.find(function (j) { return j.id === jobId; }) || bike.jobs[0];
  },

  totals(parts) {
    var goods = 0, ship = 0;
    parts.forEach(function (p) { goods += p.price; ship += p.ship; });
    return { goods: goods, ship: ship, all: goods + ship };
  },

  registerPWA(swUrl) {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register(swUrl).catch(function () {});
  }
};
