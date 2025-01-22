from flask import Flask, render_template, request
from solar_data import get_solar_state_vectors
# from rk45_solve import get_future_orbits_rk45

app = Flask(__name__)


def clamp(value, min_value, max_value):
    return max(min(value, max_value), min_value)


@app.route("/")
def index():
    # wreck stuff with pluto
    # http://127.0.0.1:5000/?dt_sim_scale=1000000000000000000&pluto_scale=10000000000000000000000
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
    svs = get_solar_state_vectors(1e-7)
    # orbits = get_future_orbits_rk45(svs, n=2000, scale=1e-7, pluto_scale=pluto_scale)
    """
    for my live site, the python backend was so slow, I solve the future orbits in JS loops.
    Thank you to the browser wars for making JS so fast
    """
    return render_template("index.html", pyData={
        # 'orbits': orbits,
        'svs': svs,
        'pluto_scale': pluto_scale,
        'dt_sim_scale': dt_sim_scale
    })


if __name__ == "__main__":
    app.run(host='0.0.0.0', port=5000)
