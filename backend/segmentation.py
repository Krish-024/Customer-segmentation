"""
Customer Segmentation Engine
Performs RFM analysis and K-Means clustering on customer transaction data.
"""

import pandas as pd
import numpy as np
from sklearn.preprocessing import StandardScaler
from sklearn.cluster import KMeans
from datetime import datetime


REFERENCE_DATE = datetime(2026, 4, 17)

# Segment label templates ordered by overall RFM score (best to worst)
SEGMENT_LABELS = [
    {"name": "Champions", "color": "#10b981", "icon": "👑", "description": "Best customers. High frequency, recent purchases, big spenders."},
    {"name": "Loyal Customers", "color": "#06b6d4", "icon": "💎", "description": "Consistent and reliable. Shop often and spend well."},
    {"name": "Potential Loyalists", "color": "#7c3aed", "icon": "🚀", "description": "Recent customers with decent frequency. Nurture them."},
    {"name": "Promising", "color": "#3b82f6", "icon": "⭐", "description": "Recent shoppers who haven't bought much yet. Engage early."},
    {"name": "New Customers", "color": "#8b5cf6", "icon": "🌱", "description": "Just arrived. Make a great first impression."},
    {"name": "Need Attention", "color": "#f59e0b", "icon": "⚠️", "description": "Above average customers showing signs of decline."},
    {"name": "About to Sleep", "color": "#f97316", "icon": "😴", "description": "Below average recency and frequency. Re-engage soon."},
    {"name": "At Risk", "color": "#ef4444", "icon": "🔥", "description": "Were valuable customers but haven't purchased recently."},
    {"name": "Can't Lose Them", "color": "#dc2626", "icon": "🚨", "description": "High spenders who are slipping away. Act now."},
    {"name": "Hibernating", "color": "#6b7280", "icon": "❄️", "description": "Inactive customers with low engagement across all metrics."},
]


def calculate_rfm(customers_df, transactions_df, reference_date=None):
    """
    Calculate RFM (Recency, Frequency, Monetary) values for each customer.

    Returns:
        DataFrame with CustomerID, Recency, Frequency, Monetary columns
    """
    if reference_date is None:
        reference_date = REFERENCE_DATE

    # Parse dates
    transactions = transactions_df.copy()
    transactions["Date"] = pd.to_datetime(transactions["Date"])

    # Aggregate per customer
    rfm = transactions.groupby("CustomerID").agg(
        Recency=("Date", lambda x: (reference_date - x.max()).days),
        Frequency=("TransactionID", "nunique"),
        Monetary=("Amount", "sum")
    ).reset_index()

    # Round monetary to 2 decimal places
    rfm["Monetary"] = rfm["Monetary"].round(2)

    return rfm


def compute_elbow(rfm_df, max_k=10):
    """
    Compute inertia values for the Elbow Method.

    Returns:
        List of dicts with {k, inertia} for k=2..max_k
    """
    features = rfm_df[["Recency", "Frequency", "Monetary"]].values
    scaler = StandardScaler()
    scaled = scaler.fit_transform(features)

    results = []
    for k in range(2, max_k + 1):
        kmeans = KMeans(n_clusters=k, random_state=42, n_init=10, max_iter=300)
        kmeans.fit(scaled)
        results.append({"k": k, "inertia": round(float(kmeans.inertia_), 2)})

    return results


def find_optimal_k(elbow_data):
    """
    Use the 'knee' heuristic to find the optimal k from elbow data.
    Picks the k where the second derivative of inertia is maximized.
    """
    inertias = [d["inertia"] for d in elbow_data]
    ks = [d["k"] for d in elbow_data]

    if len(inertias) < 3:
        return ks[0]

    # Compute second derivative (acceleration)
    second_deriv = []
    for i in range(1, len(inertias) - 1):
        d2 = inertias[i - 1] - 2 * inertias[i] + inertias[i + 1]
        second_deriv.append(d2)

    # The optimal k is where the second derivative is maximum
    optimal_idx = np.argmax(second_deriv) + 1  # +1 because we start from index 1
    return ks[optimal_idx]


def run_clustering(rfm_df, k):
    """
    Run K-Means clustering on RFM data.

    Returns:
        rfm_df with added 'Cluster' and 'Segment' columns,
        segment_profiles dict
    """
    features = rfm_df[["Recency", "Frequency", "Monetary"]].values
    scaler = StandardScaler()
    scaled = scaler.fit_transform(features)

    kmeans = KMeans(n_clusters=k, random_state=42, n_init=10, max_iter=300)
    rfm_df = rfm_df.copy()
    rfm_df["Cluster"] = kmeans.fit_predict(scaled)

    # Compute cluster centers in original scale
    centers = scaler.inverse_transform(kmeans.cluster_centers_)

    # Score each cluster: low recency is good, high frequency & monetary are good
    cluster_scores = []
    for i in range(k):
        # Normalize each dimension to 0-1 range for scoring
        r_score = 1 - (centers[i][0] - centers[:, 0].min()) / (centers[:, 0].max() - centers[:, 0].min() + 1e-10)
        f_score = (centers[i][1] - centers[:, 1].min()) / (centers[:, 1].max() - centers[:, 1].min() + 1e-10)
        m_score = (centers[i][2] - centers[:, 2].min()) / (centers[:, 2].max() - centers[:, 2].min() + 1e-10)
        total_score = r_score * 0.3 + f_score * 0.35 + m_score * 0.35
        cluster_scores.append((i, total_score))

    # Sort clusters by score (best → worst) and assign labels
    cluster_scores.sort(key=lambda x: x[1], reverse=True)

    # Select labels evenly from our template list
    label_indices = np.linspace(0, len(SEGMENT_LABELS) - 1, k, dtype=int)
    label_map = {}
    color_map = {}
    icon_map = {}
    desc_map = {}

    for rank, (cluster_id, score) in enumerate(cluster_scores):
        label_idx = label_indices[rank]
        label = SEGMENT_LABELS[label_idx]
        label_map[cluster_id] = label["name"]
        color_map[cluster_id] = label["color"]
        icon_map[cluster_id] = label["icon"]
        desc_map[cluster_id] = label["description"]

    rfm_df["Segment"] = rfm_df["Cluster"].map(label_map)
    rfm_df["SegmentColor"] = rfm_df["Cluster"].map(color_map)
    rfm_df["SegmentIcon"] = rfm_df["Cluster"].map(icon_map)

    # Build segment profiles
    profiles = []
    for cluster_id in range(k):
        mask = rfm_df["Cluster"] == cluster_id
        cluster_data = rfm_df[mask]
        profiles.append({
            "cluster": int(cluster_id),
            "name": label_map[cluster_id],
            "color": color_map[cluster_id],
            "icon": icon_map[cluster_id],
            "description": desc_map[cluster_id],
            "count": int(mask.sum()),
            "percentage": round(float(mask.sum() / len(rfm_df) * 100), 1),
            "avg_recency": round(float(cluster_data["Recency"].mean()), 1),
            "avg_frequency": round(float(cluster_data["Frequency"].mean()), 1),
            "avg_monetary": round(float(cluster_data["Monetary"].mean()), 2),
            "median_recency": round(float(cluster_data["Recency"].median()), 1),
            "median_frequency": round(float(cluster_data["Frequency"].median()), 1),
            "median_monetary": round(float(cluster_data["Monetary"].median()), 2),
        })

    # Sort profiles by score (Champions first)
    profiles.sort(key=lambda p: p["avg_monetary"] * p["avg_frequency"], reverse=True)

    return rfm_df, profiles


def get_demographic_breakdown(rfm_df, customers_df):
    """
    Get demographic breakdown per segment.

    Returns dict with age, gender, city, and membership tier distributions per segment.
    """
    merged = rfm_df.merge(customers_df, on="CustomerID", how="left")
    segments = merged["Segment"].unique().tolist()

    result = {"segments": segments, "age": {}, "gender": {}, "city": {}, "membership": {}}

    for seg in segments:
        seg_data = merged[merged["Segment"] == seg]

        # Age distribution (binned)
        age_bins = [18, 25, 35, 45, 55, 65, 71]
        age_labels = ["18-24", "25-34", "35-44", "45-54", "55-64", "65+"]
        age_counts = pd.cut(seg_data["Age"], bins=age_bins, labels=age_labels, right=False).value_counts().sort_index()
        result["age"][seg] = {str(k): int(v) for k, v in age_counts.items()}

        # Gender distribution
        gender_counts = seg_data["Gender"].value_counts()
        result["gender"][seg] = {str(k): int(v) for k, v in gender_counts.items()}

        # Top 5 cities
        city_counts = seg_data["City"].value_counts().head(5)
        result["city"][seg] = {str(k): int(v) for k, v in city_counts.items()}

        # Membership tier
        tier_counts = seg_data["MembershipTier"].value_counts()
        result["membership"][seg] = {str(k): int(v) for k, v in tier_counts.items()}

    return result


def get_purchase_patterns(rfm_df, transactions_df):
    """
    Get purchase patterns per segment.

    Returns dict with category and payment method distributions per segment.
    """
    # Merge transactions with segment info
    tx_with_seg = transactions_df.merge(
        rfm_df[["CustomerID", "Segment"]],
        on="CustomerID",
        how="left"
    )

    segments = tx_with_seg["Segment"].unique().tolist()

    result = {"segments": segments, "categories": {}, "payment_methods": {}, "monthly_trend": {}}

    for seg in segments:
        seg_data = tx_with_seg[tx_with_seg["Segment"] == seg]

        # Product category distribution
        cat_counts = seg_data["ProductCategory"].value_counts()
        result["categories"][seg] = {str(k): int(v) for k, v in cat_counts.items()}

        # Payment method distribution
        pay_counts = seg_data["PaymentMethod"].value_counts()
        result["payment_methods"][seg] = {str(k): int(v) for k, v in pay_counts.items()}

        # Monthly transaction trend
        seg_data_copy = seg_data.copy()
        seg_data_copy["Month"] = pd.to_datetime(seg_data_copy["Date"]).dt.to_period("M").astype(str)
        monthly = seg_data_copy.groupby("Month").agg(
            tx_count=("TransactionID", "count"),
            total_amount=("Amount", "sum")
        ).reset_index()
        monthly = monthly.sort_values("Month").tail(12)
        result["monthly_trend"][seg] = {
            "months": monthly["Month"].tolist(),
            "counts": monthly["tx_count"].tolist(),
            "amounts": [round(float(x), 2) for x in monthly["total_amount"].tolist()]
        }

    return result


def get_customer_list(rfm_df, customers_df):
    """
    Get full customer list with RFM values and segment assignment.
    """
    merged = rfm_df.merge(customers_df, on="CustomerID", how="left")
    cols = ["CustomerID", "Name", "Age", "Gender", "City", "MembershipTier",
            "JoinDate", "Recency", "Frequency", "Monetary", "Segment", "SegmentColor"]
    result = merged[cols].to_dict(orient="records")

    # Convert numpy types to native Python types
    for row in result:
        for key, val in row.items():
            if isinstance(val, (np.integer,)):
                row[key] = int(val)
            elif isinstance(val, (np.floating,)):
                row[key] = float(val)

    return result
