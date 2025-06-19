from flask import Flask, render_template, request
from solar_data import get_solar_state_vectors
from datetime import datetime

# from rk45_solve import get_future_orbits_rk45

app = Flask(__name__)


def clamp(value, min_value, max_value):
    return max(min(value, max_value), min_value)


def parse_birthday(birthday_str):
    try:
        return datetime.strptime(birthday_str, '%Y-%m-%d')
    except ValueError:
        return None


@app.route("/")
def index():
    # wreck stuff with pluto
    # http://127.0.0.1:5000/?dt_sim_scale=1000000000000000000&pluto_scale=10000000000000000000000
    # year-month-day
    # Example with birthday: http://127.0.0.1:5000/?birthday=2025-08-10

    pluto_scale = 1.0
    try:
        pluto_scale = clamp(abs(int(request.args.get('pluto_scale', 1.0))), 1.0, 10000000000)
    except ValueError:
        pass

    dt_sim_scale = .001
    try:
        dt_sim_scale = clamp(abs(int(request.args.get('dt_sim_scale', 100.0))), 0.00001, 1000000.0)
    except ValueError:
        pass

    # Parse birthday parameter
    birthday_str = request.args.get('birthday')
    birthday_date = None
    if birthday_str:
        birthday_date = parse_birthday(birthday_str)
        if birthday_date is None:
            print(f"Invalid birthday format: {birthday_str}. Expected format: YYYY-MM-DD")

    # Get solar state vectors for the specified date (or current date if no birthday provided)
    svs = get_solar_state_vectors(1e-7, target_date=birthday_date)

    # the python backend was so slow, so I solve the future orbits in JS loops.
    # orbits = get_future_orbits_rk45(svs, n=2000, scale=1e-7, pluto_scale=pluto_scale)

    return render_template("index.html", pyData={
        # 'orbits': orbits,
        'svs': svs,
        'pluto_scale': pluto_scale,
        'dt_sim_scale': dt_sim_scale,
        'birthday': birthday_str if birthday_date else ""
    })


if __name__ == "__main__":
    app.run(host='0.0.0.0', port=5000)