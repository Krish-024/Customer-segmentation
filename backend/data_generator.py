"""
Synthetic Customer & Transaction Data Generator
Generates realistic e-commerce data for customer segmentation analysis.
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import os
import random

# Seed for reproducibility
np.random.seed(42)
random.seed(42)

# --- Configuration ---
NUM_CUSTOMERS = 2000
AVG_TRANSACTIONS_PER_CUSTOMER = 8  # ~16,000 total transactions
REFERENCE_DATE = datetime(2026, 4, 17)

CITIES = [
    "Mumbai", "Delhi", "Bangalore", "Hyderabad", "Chennai",
    "Kolkata", "Pune", "Ahmedabad", "Jaipur", "Lucknow",
    "Chandigarh", "Bhopal", "Indore", "Nagpur", "Coimbatore"
]

CITY_WEIGHTS = [0.15, 0.14, 0.13, 0.10, 0.08, 0.07, 0.06, 0.05, 0.04, 0.04,
                0.03, 0.03, 0.03, 0.03, 0.02]

PRODUCT_CATEGORIES = [
    "Electronics", "Fashion", "Home & Kitchen", "Books",
    "Beauty & Personal Care", "Sports & Fitness", "Groceries",
    "Toys & Games", "Automotive", "Health & Wellness"
]

PAYMENT_METHODS = ["Credit Card", "Debit Card", "UPI", "Net Banking", "Cash on Delivery", "Wallet"]

MEMBERSHIP_TIERS = ["Bronze", "Silver", "Gold", "Platinum"]

FIRST_NAMES_M = [
    "Aarav", "Vivaan", "Aditya", "Vihaan", "Arjun", "Sai", "Reyansh", "Ayaan",
    "Krishna", "Ishaan", "Rohan", "Rahul", "Amit", "Vijay", "Raj", "Karan",
    "Nikhil", "Suresh", "Deepak", "Manish", "Ankur", "Gaurav", "Prashant", "Siddharth"
]

FIRST_NAMES_F = [
    "Aadhya", "Diya", "Saanvi", "Ananya", "Isha", "Aanya", "Pari", "Myra",
    "Sara", "Navya", "Priya", "Sneha", "Pooja", "Neha", "Riya", "Shreya",
    "Kavya", "Meera", "Tanvi", "Sakshi", "Divya", "Anjali", "Bhavna", "Chitra"
]

LAST_NAMES = [
    "Sharma", "Verma", "Gupta", "Singh", "Kumar", "Patel", "Reddy", "Nair",
    "Iyer", "Joshi", "Mehta", "Shah", "Das", "Mukherjee", "Rao", "Agarwal",
    "Chatterjee", "Pillai", "Menon", "Bose", "Deshpande", "Kulkarni", "Tiwari", "Pandey"
]


def generate_customers(n=NUM_CUSTOMERS):
    """Generate customer profiles with realistic distributions."""
    customers = []

    for i in range(1, n + 1):
        gender = np.random.choice(["Male", "Female"], p=[0.52, 0.48])
        if gender == "Male":
            first_name = random.choice(FIRST_NAMES_M)
        else:
            first_name = random.choice(FIRST_NAMES_F)
        last_name = random.choice(LAST_NAMES)
        name = f"{first_name} {last_name}"

        # Age: skewed towards 25-45 (prime e-commerce demographic)
        age = int(np.clip(np.random.normal(35, 12), 18, 70))

        city = np.random.choice(CITIES, p=CITY_WEIGHTS)

        # Membership tier: higher tiers are rarer
        tier = np.random.choice(MEMBERSHIP_TIERS, p=[0.45, 0.30, 0.18, 0.07])

        # Join date: spread over last 3 years
        days_since_join = np.random.randint(30, 1095)
        join_date = REFERENCE_DATE - timedelta(days=int(days_since_join))

        customers.append({
            "CustomerID": f"CUST-{i:04d}",
            "Name": name,
            "Age": age,
            "Gender": gender,
            "City": city,
            "MembershipTier": tier,
            "JoinDate": join_date.strftime("%Y-%m-%d")
        })

    return pd.DataFrame(customers)


def generate_transactions(customers_df):
    """Generate transactions with realistic purchase patterns."""
    transactions = []
    tx_id = 1

    for _, cust in customers_df.iterrows():
        cust_id = cust["CustomerID"]
        tier = cust["MembershipTier"]
        age = cust["Age"]
        join_date = datetime.strptime(cust["JoinDate"], "%Y-%m-%d")

        # Number of transactions depends on membership tier
        tier_multiplier = {"Bronze": 0.6, "Silver": 1.0, "Gold": 1.5, "Platinum": 2.5}
        base_txns = max(1, int(np.random.poisson(AVG_TRANSACTIONS_PER_CUSTOMER * tier_multiplier[tier])))

        # Spending profile based on tier and age
        tier_spend = {"Bronze": 500, "Silver": 1200, "Gold": 2500, "Platinum": 5000}
        base_spend = tier_spend[tier]

        # Category preferences vary by age group
        if age < 25:
            cat_probs = [0.20, 0.25, 0.05, 0.05, 0.15, 0.10, 0.05, 0.08, 0.02, 0.05]
        elif age < 35:
            cat_probs = [0.20, 0.15, 0.12, 0.08, 0.10, 0.08, 0.10, 0.05, 0.05, 0.07]
        elif age < 50:
            cat_probs = [0.15, 0.10, 0.18, 0.10, 0.08, 0.05, 0.15, 0.05, 0.07, 0.07]
        else:
            cat_probs = [0.10, 0.08, 0.15, 0.15, 0.10, 0.03, 0.18, 0.03, 0.05, 0.13]

        # Payment method preferences
        if age < 30:
            pay_probs = [0.20, 0.15, 0.35, 0.05, 0.10, 0.15]
        elif age < 45:
            pay_probs = [0.30, 0.20, 0.25, 0.10, 0.08, 0.07]
        else:
            pay_probs = [0.25, 0.25, 0.15, 0.15, 0.15, 0.05]

        days_available = (REFERENCE_DATE - join_date).days

        for _ in range(base_txns):
            # Transaction date: weighted towards recent dates
            days_ago = int(np.clip(np.abs(np.random.exponential(days_available * 0.3)), 0, days_available))
            tx_date = REFERENCE_DATE - timedelta(days=days_ago)

            # Amount: log-normal distribution centered on tier spend
            amount = round(float(np.random.lognormal(np.log(base_spend), 0.8)), 2)
            amount = max(50, min(amount, 50000))  # Clip to realistic range

            category = np.random.choice(PRODUCT_CATEGORIES, p=cat_probs)
            payment = np.random.choice(PAYMENT_METHODS, p=pay_probs)

            transactions.append({
                "TransactionID": f"TXN-{tx_id:06d}",
                "CustomerID": cust_id,
                "Date": tx_date.strftime("%Y-%m-%d"),
                "Amount": amount,
                "ProductCategory": category,
                "PaymentMethod": payment
            })
            tx_id += 1

    return pd.DataFrame(transactions)


def generate_dataset(output_dir=None):
    """Generate complete dataset and save to CSV files."""
    if output_dir is None:
        output_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")

    os.makedirs(output_dir, exist_ok=True)

    print("Generating customer profiles...")
    customers_df = generate_customers()

    print("Generating transactions...")
    transactions_df = generate_transactions(customers_df)

    # Save to CSV
    customers_path = os.path.join(output_dir, "customers.csv")
    transactions_path = os.path.join(output_dir, "transactions.csv")

    customers_df.to_csv(customers_path, index=False)
    transactions_df.to_csv(transactions_path, index=False)

    print(f"[OK] Generated {len(customers_df)} customers -> {customers_path}")
    print(f"[OK] Generated {len(transactions_df)} transactions -> {transactions_path}")

    return customers_df, transactions_df


if __name__ == "__main__":
    generate_dataset()
