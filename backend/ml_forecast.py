from datetime import date, timedelta

import numpy as np
from sklearn.linear_model import LinearRegression


def _to_date(value):
    if value is None:
        return None
    if isinstance(value, date) and not hasattr(value, "hour"):
        return value
    if hasattr(value, "date"):
        return value.date()
    return date.fromisoformat(str(value)[:10])


def _daily_series(sales_rows):
    """
    Build a continuous daily quantity series from historical sales.
    Spans from the earliest recorded sale date to the latest recorded sale date.
    Zero-sales days between the first and last sale are accounted for with 0.0.
    """
    if not sales_rows:
        return [], []

    parsed = []
    for row in sales_rows:
        sale_date = _to_date(row.get("sale_date"))
        if not sale_date:
            continue
        try:
            qty = float(row.get("quantity") or 0)
        except (ValueError, TypeError):
            qty = 0.0
        if qty > 0:
            parsed.append((sale_date, qty))

    if not parsed:
        return [], []

    totals = {}
    for sale_date, qty in parsed:
        totals[sale_date] = totals.get(sale_date, 0.0) + qty

    start_date = min(totals.keys())
    end_date = max(totals.keys())

    dates = []
    quantities = []
    current = start_date
    while current <= end_date:
        dates.append(current)
        quantities.append(totals.get(current, 0.0))
        current += timedelta(days=1)

    return dates, quantities


def forecast_demand(sales_rows, current_stock, minimum_stock, days=30):
    """
    Forecast inventory demand based on actual historical sales data.

    Answers the core inventory questions:
    1. How many units are sold per day? (averageDailySales)
    2. How many units are expected to be sold for the user-entered days? (expectedSales)
    3. How much stock is currently available? (currentStock)
    4. How much stock should be purchased? (recommendedQuantity = max(0, expectedSales - currentStock))

    For products with no sales history:
    - averageDailySales: 0
    - expectedSales: 0
    - recommendedQuantity: max(0, minimum_stock - current_stock)
    """
    days = max(1, int(days or 30))
    current_stock = float(current_stock or 0)
    minimum_stock = float(minimum_stock or 0)

    dates, quantities = _daily_series(sales_rows)
    sample_count = len(quantities)
    total_sales = float(sum(quantities))

    has_history = sample_count > 0 and total_sales > 0

    if not has_history:
        predicted_daily = 0
        expected_sales = 0
        r_squared = None
        model_used = "None"
        history_note = "No historical sales found for this product."
        remaining_stock = int(round(current_stock))
        recommended_quantity = max(0, int(round(minimum_stock - current_stock)))

        if current_stock <= 0:
            status = "Critical"
            recommendation = (
                f"No historical sales data found. Stock is empty. Recommend purchasing "
                f"{recommended_quantity} units to meet the minimum stock level ({int(minimum_stock)} units)."
            )
        elif current_stock < minimum_stock:
            status = "Low Stock"
            recommendation = (
                f"No historical sales data found. Current stock ({int(current_stock)}) is below "
                f"the minimum stock level ({int(minimum_stock)}). Recommend purchasing {recommended_quantity} units."
            )
        else:
            status = "Sufficient"
            recommendation = (
                f"No historical sales data found. Current stock ({int(current_stock)}) meets "
                f"the minimum stock level ({int(minimum_stock)}). No purchase required."
            )
    else:
        historical_daily_rate = total_sales / sample_count
        model_used = "Historical Daily Average"
        r_squared = None

        distinct_sale_dates = len([q for q in quantities if q > 0])
        # Use Linear Regression only when sufficient data exists (>= 5 observed days, >= 3 sale dates)
        if sample_count >= 5 and distinct_sale_dates >= 3:
            x = np.arange(sample_count, dtype=float).reshape(-1, 1)
            y = np.array(quantities, dtype=float)
            model = LinearRegression()
            model.fit(x, y)
            score = float(model.score(x, y))
            r_squared = round(score, 4)
            slope = float(model.coef_[0])

            future_x = np.arange(sample_count, sample_count + days, dtype=float).reshape(-1, 1)
            future_y = np.maximum(model.predict(future_x), 0.0)
            trend_avg = float(np.mean(future_y))

            if slope > 0 and score > 0 and trend_avg > 0:
                daily_rate = trend_avg
                model_used = "Linear Regression"
                history_note = (
                    f"Forecast based on Linear Regression over {sample_count} observed days (R²: {r_squared})."
                )
            else:
                daily_rate = historical_daily_rate
                history_note = (
                    f"Calculated from {int(total_sales)} units sold across {sample_count} observed days."
                )
        else:
            if sample_count >= 2:
                x = np.arange(sample_count, dtype=float).reshape(-1, 1)
                y = np.array(quantities, dtype=float)
                model = LinearRegression().fit(x, y)
                r_squared = round(float(model.score(x, y)), 4)
            else:
                r_squared = 0.0

            daily_rate = historical_daily_rate
            history_note = (
                f"Calculated from {int(total_sales)} units sold across {sample_count} observed days."
            )

        predicted_daily = max(1, int(round(daily_rate)))
        expected_sales = int(predicted_daily * days)
        recommended_quantity = max(0, int(round(expected_sales - current_stock)))
        remaining_stock = int(round(current_stock - expected_sales))

        if current_stock <= 0:
            status = "Critical"
            recommendation = (
                f"Stock is depleted. Immediate replenishment of {recommended_quantity} units "
                f"is required to cover expected demand ({expected_sales} units)."
            )
        elif current_stock < expected_sales:
            status = "Low Stock"
            recommendation = (
                f"Current stock ({int(current_stock)} units) is below expected sales ({expected_sales} units). "
                f"Recommend purchasing {recommended_quantity} units."
            )
        else:
            status = "Sufficient"
            recommendation = (
                f"Current stock ({int(current_stock)} units) is sufficient for the predicted period "
                f"(expected sales: {expected_sales} units). No purchase is required."
            )

    return {
        "totalSales": int(total_sales),
        "averageDailySales": int(predicted_daily),
        "predictionDays": int(days),
        "expectedSales": int(expected_sales),
        "remainingStock": int(remaining_stock),
        "recommendedQuantity": int(recommended_quantity),
        "status": status,
        "recommendation": recommendation,
        "model": model_used,
        "rSquared": r_squared,
        "historyDays": int(sample_count),
        "hasSalesHistory": bool(has_history),
        "historyNote": history_note,
    }
