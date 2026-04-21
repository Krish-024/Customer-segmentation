"""
Flask API Server for Customer Segmentation Dashboard
"""

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import pandas as pd
import os
import sys

from data_generator import generate_dataset
from segmentation import (
    calculate_rfm,
    compute_elbow,
    find_optimal_k,
    run_clustering,
    get_demographic_breakdown,
    get_purchase_patterns,
    get_customer_list,
)

app = Flask(__name__, static_folder=None)
CORS(app)

# --- State ---
DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
state = {
    "customers_df": None,
    "transactions_df": None,
    "rfm_df": None,
    "profiles": None,
    "elbow_data": None,
    "optimal_k": None,
    "k": None,
}


def load_data_from_files():
    """Load existing CSVs from data directory if available."""
    cust_path = os.path.join(DATA_DIR, "customers.csv")
    tx_path = os.path.join(DATA_DIR, "transactions.csv")
    if os.path.exists(cust_path) and os.path.exists(tx_path):
        state["customers_df"] = pd.read_csv(cust_path)
        state["transactions_df"] = pd.read_csv(tx_path)
        return True
    return False


# ---------- Serve Frontend ----------

FRONTEND_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend")

@app.route("/")
def serve_index():
    return send_from_directory(FRONTEND_DIR, "index.html")

@app.route("/css/<path:filename>")
def serve_css(filename):
    return send_from_directory(os.path.join(FRONTEND_DIR, "css"), filename)

@app.route("/js/<path:filename>")
def serve_js(filename):
    return send_from_directory(os.path.join(FRONTEND_DIR, "js"), filename)


# ---------- API Endpoints ----------

@app.route("/api/generate", methods=["POST"])
def api_generate():
    """Generate synthetic dataset."""
    try:
        customers_df, transactions_df = generate_dataset(DATA_DIR)
        state["customers_df"] = customers_df
        state["transactions_df"] = transactions_df
        state["rfm_df"] = None
        state["profiles"] = None
        return jsonify({
            "status": "success",
            "customers": len(customers_df),
            "transactions": len(transactions_df)
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route("/api/upload", methods=["POST"])
def api_upload():
    """Upload CSV/Excel files for customers and transactions."""
    try:
        if "customers" not in request.files or "transactions" not in request.files:
            return jsonify({"status": "error", "message": "Both 'customers' and 'transactions' files are required."}), 400

        cust_file = request.files["customers"]
        tx_file = request.files["transactions"]

        # Read based on file extension
        if cust_file.filename.endswith(".xlsx"):
            state["customers_df"] = pd.read_excel(cust_file)
        else:
            state["customers_df"] = pd.read_csv(cust_file)

        if tx_file.filename.endswith(".xlsx"):
            state["transactions_df"] = pd.read_excel(tx_file)
        else:
            state["transactions_df"] = pd.read_csv(tx_file)

        # Save uploaded files
        os.makedirs(DATA_DIR, exist_ok=True)
        state["customers_df"].to_csv(os.path.join(DATA_DIR, "customers.csv"), index=False)
        state["transactions_df"].to_csv(os.path.join(DATA_DIR, "transactions.csv"), index=False)

        state["rfm_df"] = None
        state["profiles"] = None

        return jsonify({
            "status": "success",
            "customers": len(state["customers_df"]),
            "transactions": len(state["transactions_df"])
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route("/api/elbow", methods=["GET"])
def api_elbow():
    """Compute Elbow Method data."""
    if state["customers_df"] is None:
        return jsonify({"status": "error", "message": "No data loaded. Generate or upload data first."}), 400

    try:
        # Calculate RFM if not done yet
        if state["rfm_df"] is None:
            state["rfm_df"] = calculate_rfm(state["customers_df"], state["transactions_df"])

        elbow_data = compute_elbow(state["rfm_df"])
        optimal_k = find_optimal_k(elbow_data)

        state["elbow_data"] = elbow_data
        state["optimal_k"] = optimal_k

        return jsonify({
            "status": "success",
            "elbow": elbow_data,
            "optimal_k": optimal_k
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route("/api/segment", methods=["POST"])
def api_segment():
    """Run segmentation with specified k."""
    if state["customers_df"] is None:
        return jsonify({"status": "error", "message": "No data loaded."}), 400

    try:
        body = request.get_json() or {}
        k = body.get("k", state.get("optimal_k", 5))
        k = int(k)

        if state["rfm_df"] is None:
            state["rfm_df"] = calculate_rfm(state["customers_df"], state["transactions_df"])

        rfm_df, profiles = run_clustering(state["rfm_df"], k)
        state["rfm_df"] = rfm_df
        state["profiles"] = profiles
        state["k"] = k

        return jsonify({
            "status": "success",
            "k": k,
            "profiles": profiles,
            "total_customers": len(rfm_df),
            "total_revenue": round(float(rfm_df["Monetary"].sum()), 2),
            "avg_order_value": round(float(state["transactions_df"]["Amount"].mean()), 2),
            "avg_recency": round(float(rfm_df["Recency"].mean()), 1),
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route("/api/segments", methods=["GET"])
def api_segments():
    """Get segment profiles."""
    if state["profiles"] is None:
        return jsonify({"status": "error", "message": "Run segmentation first."}), 400

    return jsonify({"status": "success", "profiles": state["profiles"]})


@app.route("/api/customers", methods=["GET"])
def api_customers():
    """Get customer list with segment assignments."""
    if state["rfm_df"] is None or "Segment" not in state["rfm_df"].columns:
        return jsonify({"status": "error", "message": "Run segmentation first."}), 400

    try:
        customers = get_customer_list(state["rfm_df"], state["customers_df"])
        return jsonify({"status": "success", "customers": customers})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route("/api/demographics", methods=["GET"])
def api_demographics():
    """Get demographic breakdown per segment."""
    if state["rfm_df"] is None or "Segment" not in state["rfm_df"].columns:
        return jsonify({"status": "error", "message": "Run segmentation first."}), 400

    try:
        data = get_demographic_breakdown(state["rfm_df"], state["customers_df"])
        return jsonify({"status": "success", "data": data})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route("/api/patterns", methods=["GET"])
def api_patterns():
    """Get purchase patterns per segment."""
    if state["rfm_df"] is None or "Segment" not in state["rfm_df"].columns:
        return jsonify({"status": "error", "message": "Run segmentation first."}), 400

    try:
        data = get_purchase_patterns(state["rfm_df"], state["transactions_df"])
        return jsonify({"status": "success", "data": data})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


if __name__ == "__main__":
    # Try to load existing data on startup
    if load_data_from_files():
        print("[OK] Loaded existing dataset from data/ directory")
    else:
        print("[INFO] No existing data. Use /api/generate or /api/upload to load data.")

    print("\n[START] Starting Customer Segmentation Server...")
    print("   Dashboard: http://localhost:5000\n")
    app.run(debug=True, port=5000)
