# solar_data
from skyfield.api import load
from datetime import datetime
import numpy as np
from skyfield.framelib import ecliptic_frame
from skyfield.api import wgs84

"""
    This Python file will grab the state vectors, positions, and velocities of the planets.

    It will need to get the state vectors in an inertial frame in order to perform physics propagation models, such as 
    Runge-Kutta.

    Three.js uses the Y-axis as "up", so we'll rotate the vectors to make Y the "up" direction.

    Using Skyfield, we'll use the ecliptic frame as the inertial frame since its "up" vector is nearly perpendicular 
    to the solar plane, which keeps the orbits less tilted.
"""

planets = load('de421.bsp')
rotX90 = np.array([[1, 0, 0], [0, 0, 1], [0, -1, 0]])


def get_body_state_vector(key: str, tn, scale=1.0):
    body = planets[key].at(tn)
    body = body.frame_xyz_and_velocity(ecliptic_frame)
    r = rotX90 @ body[0].km
    v = rotX90 @ body[1].km_per_s
    a = np.array((r * scale).tolist() + (v * scale).tolist())
    return a.tolist()


def get_solar_state_vectors(scale=1.0, target_date=None):
    ts = load.timescale()

    if target_date is None:
        utc_t = datetime.utcnow()
        timenow = ts.utc(utc_t.year, utc_t.month, utc_t.day, utc_t.hour, utc_t.minute, utc_t.second)
    else:
        utc_t = target_date
        timenow = ts.utc(utc_t.year, utc_t.month, utc_t.day, 12, 0, 0)  # Use noon UTC for consistency

    # this is used to rotate earth to correctly face the sun
    earth = planets['earth']
    sun = planets['sun']
    astrometric = earth.at(timenow).observe(sun)
    lat, lon = wgs84.latlon_of(astrometric)

    return {
        # Store both timestamp and readable date string
        'timestamp': utc_t.timestamp(),
        'date_string': utc_t.strftime("%Y-%m-%d %H:%M:%S") + " UTC",
        'km_scale': scale,
        'sun': get_body_state_vector('sun', timenow, scale),
        'mercury': get_body_state_vector('mercury BARYCENTER', timenow, scale),
        'venus': get_body_state_vector('venus BARYCENTER', timenow, scale),
        'earth': get_body_state_vector('earth BARYCENTER', timenow, scale),
        'moon': get_body_state_vector('moon', timenow, scale),
        'mars': get_body_state_vector('mars BARYCENTER', timenow, scale),
        'jupiter': get_body_state_vector('jupiter BARYCENTER', timenow, scale),
        'saturn': get_body_state_vector('saturn BARYCENTER', timenow, scale),
        'uranus': get_body_state_vector('uranus BARYCENTER', timenow, scale),
        'neptune': get_body_state_vector('neptune BARYCENTER', timenow, scale),
        'pluto': get_body_state_vector('pluto BARYCENTER', timenow, scale),
        'earth_sun_theta': lon.radians
    }
