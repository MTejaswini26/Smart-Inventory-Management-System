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


def _daily_series(sales_rows, end_date=None):
    """Build a continuous daily quantity series from historical sales."""
    if not sales_rows:
        return [], []

    parsed = []
    for row in sales_rows:
        sale_date = _to_date(row.get("sale_date"))
        if not sale_date:
            continue
        parsed.append((sale_date, float(row.get("quantity") or 0)))

    if not parsed:
        return [], []

    start = min(item[0] for item in parsed)
    end = end_date or date.today()
    if end < start:
        end = start

    totals = {}
    for sale_date, quantity in parsed:
        totals[sale_date] = totals.get(sale_date, 0.0) + quantity

    dates = []
    quantities = []
    current = start
    while current <= end:
        dates.append(current)
        quantities.append(totals.get(current, 0.0))
        current += timedelta(days=1)

    return dates, quantities


def forecast_demand(sales_rows, current_stock, minimum_stock, days=30):
    """
    Forecast demand with Linear Regression on daily sales quantities.

    X = day index from the first sale
    y = units sold that day (missing days filled with 0)
    Predicted demand is the sum of non-negative daily predictions
    for the next `days` days.

    All user-facing quantities are INTEGERs. The rounding method used
    across every quantity is ceil(): a fractional daily demand means a
    unit can be needed on some day, so rounding down (round()) would
    display an unnecessary 0 and under-state replenishment needs. ceil()
    never under-forecasts and is already the method used for the expected
    sales and the recommended purchase quantities.
    """
    days = max(1, int(days or 30))
    current_stock = float(current_stock or 0)
    minimum_stock = float(minimum_stock or 0)

    dates, quantities = _daily_series(sales_rows)
    sample_count = len(quantities)
    total_sales = float(sum(quantities))

    has_history = sample_count > 0 and total_sales > 0

    if sample_count == 0:
        predicted_daily = 0
        expected_sales = 0
        r_squared = None
        model_used = "Linear Regression"
        history_note = (
            "No historical sales found. The model cannot learn a trend yet."
        )
    else:
        x = np.arange(sample_count, dtype=float).reshape(-1, 1)
        y = np.array(quantities, dtype=float)

        single_observation = sample_count == 1
        if single_observation:
            x = np.array([[0.0], [1.0]])
            y = np.array([y[0], y[0]], dtype=float)

        model = LinearRegression()
        model.fit(x, y)
        # R² needs at least two real daily observations. With a single
        # observation the duplicated-point fit would report a fake 1.0, so
        # it is reported as N/A (None) instead of an artificial value.
        r_squared = None if single_observation else float(model.score(x, y))

        future_x = np.arange(
            sample_count, sample_count + days, dtype=float
        ).reshape(-1, 1)
        future_y = model.predict(future_x)
        future_y = np.maximum(future_y, 0.0)

        trend_total = float(np.sum(future_y))

        if trend_total > 0:
            expected_sales = int(np.ceil(trend_total))
            model_used = "Linear Regression"
            history_note = (
                f"Trained on {sample_count} daily sales observations "
                "using Linear Regression."
            )
        else:
            # The linear trend extrapolates to zero (or negative) demand for the
            # forecast window. This happens when sales are sparse/intermittent:
            # the daily series contains long stretches of zero days after the
            # recorded sales, which forces the regression slope downwards.
            # Instead of reporting a fake zero prediction, fall back to the
            # actual average daily demand observed in the historical data
            # (a level forecast computed purely from real sales records).
            average_daily = total_sales / sample_count
            expected_sales = int(np.ceil(average_daily * days))
            model_used = "Average Daily Demand"
            history_note = (
                f"Linear trend predicts no demand for the next {days} days "
                f"because recorded sales are sparse ({int(total_sales)} units "
                f"over {sample_count} days). Using the observed average daily "
                f"demand ({average_daily:.2f} units/day) from actual sales data "
                "instead."
            )

        # Integer daily demand: ceil of the integer period total spread over
        # the prediction window. Guarantees a meaningful non-zero value
        # whenever real demand is predicted, without faking data.
        predicted_daily = int(np.ceil(expected_sales / days))

    remaining_stock = int(round(current_stock - expected_sales))
    recommended_quantity = max(
        0, int(np.ceil(expected_sales + minimum_stock - current_stock))
    )

    if remaining_stock <= 0:
        status = "Critical"
        recommendation = (
            f"Immediate restocking is required. Purchase {recommended_quantity} "
            "units to cover predicted demand and the minimum stock buffer."
        )
    elif remaining_stock <= minimum_stock:
        status = "Low Stock"
        recommendation = (
            f"Consider ordering additional stock soon. Recommended purchase "
            f"quantity: {recommended_quantity} units."
        )
    else:
        status = "Sufficient"
        if recommended_quantity > 0:
            recommendation = (
                "Current stock covers most of the predicted period. "
                f"Optional top-up quantity: {recommended_quantity} units."
            )
        else:
            recommendation = (
                "Current stock is sufficient for the predicted period. "
                "No purchase is required."
            )

    return {
        "totalSales": int(total_sales),
        "averageDailySales": int(predicted_daily),
        "predictionDays": days,
        "expectedSales": int(expected_sales),
        "remainingStock": int(remaining_stock),
        "recommendedQuantity": int(recommended_quantity),
        "status": status,
        "recommendation": recommendation,
        "model": model_used,
        "rSquared": None if r_squared is None else round(r_squared, 4),
        "historyDays": sample_count,
        "hasSalesHistory": has_history,
        "historyNote": history_note,
    }
