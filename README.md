# 🎯 Customer Segmentation Dashboard

An interactive, full-stack **Customer Segmentation** web application powered by **RFM Analysis** and **K-Means Clustering**. Discover hidden patterns in customer behaviour and get actionable segment insights through a stunning dark-themed analytics dashboard.

![Dashboard Preview](https://img.shields.io/badge/Status-Live-brightgreen) ![Python](https://img.shields.io/badge/Python-3.10+-blue) ![Flask](https://img.shields.io/badge/Flask-3.1.0-lightgrey) ![scikit--learn](https://img.shields.io/badge/scikit--learn-1.6.1-orange) ![Chart.js](https://img.shields.io/badge/Chart.js-4.4-red)

---

## ✨ Features

- **RFM Analysis** — Calculates Recency, Frequency, and Monetary scores per customer
- **K-Means Clustering** — Configurable k (2–10 clusters) with StandardScaler normalization
- **Elbow Method** — Auto-detects optimal number of clusters via WCSS inertia plot
- **Auto-Labeled Segments** — Clusters are automatically named (Champions, Loyal Customers, At Risk, Hibernating, etc.) based on RFM characteristics
- **8 Interactive Charts** — Scatter plot, Radar, Age distribution, Gender split, Membership tiers, Product categories, Payment methods
- **Customer Directory** — Searchable, sortable, filterable table with pagination (2,000+ customers)
- **Synthetic Data Generator** — Generates realistic e-commerce data instantly (no real data needed)
- **CSV / Excel Upload** — Upload your own customer and transaction datasets
- **Animated KPIs** — Live counters for revenue, customers, segments, and more
- **Premium Dark UI** — Glassmorphism design with smooth animations

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python, Flask, Flask-CORS |
| ML / Analytics | scikit-learn, pandas, numpy |
| Frontend | HTML5, CSS3, Vanilla JavaScript |
| Visualizations | Chart.js v4 |
| Data | Synthetic generator + CSV/Excel upload |

---

## 🚀 Getting Started

### 1. Clone the repository
```bash
git clone https://github.com/your-username/customer-segmentation.git
cd customer-segmentation
```

### 2. Install Python dependencies
```bash
cd backend
pip install -r requirements.txt
```

### 3. Start the server
```bash
python app.py
```

### 4. Open the dashboard
```
http://localhost:5000
```

---

## 📊 How It Works

```
1. Generate / Upload Data
        ↓
2. RFM Calculation
   • Recency  — Days since last purchase
   • Frequency — Total number of transactions
   • Monetary  — Total amount spent
        ↓
3. StandardScaler Normalization
        ↓
4. K-Means Clustering (Elbow Method → optimal k)
        ↓
5. Segment Auto-Labeling & Profiling
        ↓
6. Interactive Dashboard Visualizations
```

---

## 📁 Project Structure

```
customer-segmentation/
├── backend/
│   ├── app.py                # Flask API server (8 endpoints)
│   ├── data_generator.py     # Synthetic dataset generator
│   ├── segmentation.py       # RFM + K-Means clustering engine
│   └── requirements.txt
├── frontend/
│   ├── index.html            # Dashboard UI
│   ├── css/styles.css        # Dark glassmorphism styles
│   └── js/
│       ├── app.js            # Main application controller
│       ├── charts.js         # Chart.js visualization manager
│       └── api.js            # Backend API client
└── data/
    ├── customers.csv
    └── transactions.csv
```

---

## 🎯 Customer Segments

| Segment | Description |
|---------|-------------|
| 👑 Champions | Best customers — high frequency, recent, big spenders |
| 💎 Loyal Customers | Consistent and reliable buyers |
| 🚀 Potential Loyalists | Recent customers showing strong engagement |
| ⭐ Promising | New customers with growth potential |
| ⚠️ Need Attention | Declining engagement from above-average customers |
| 😴 About to Sleep | Below-average recency — re-engage soon |
| 🔥 At Risk | Were valuable, haven't purchased recently |
| ❄️ Hibernating | Inactive customers with low metrics |

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/generate` | Generate synthetic dataset |
| POST | `/api/upload` | Upload CSV/Excel files |
| GET | `/api/elbow` | Compute Elbow Method data |
| POST | `/api/segment` | Run K-Means clustering |
| GET | `/api/segments` | Get segment profiles |
| GET | `/api/customers` | Get customer list with segments |
| GET | `/api/demographics` | Demographic breakdown per segment |
| GET | `/api/patterns` | Purchase patterns per segment |

---

## 📸 Screenshots

> **Welcome Page → KPI Strip → Segment Cards → Scatter + Radar → Demographics → Customer Table**

---

## 📄 License

MIT License © 2026
