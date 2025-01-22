from skyfield.api import load
import numpy as np
from skyfield.framelib import itrs

"""
    This Python file retrieves the XYZ vectors for the Sun and Moon in the ECEF frame, 
        rotated into the Three.js frame.
"""


def get_sun_and_sun_norm_from_ecef(skyfield_time):
    planets = load('de421.bsp')
    earth = planets['earth']
    sun = planets['sun']
    moon = planets['moon']
    ecef_sunvec = earth.at(skyfield_time).observe(sun).apparent().frame_xyz_and_velocity(itrs)
    ecef_moonvec = earth.at(skyfield_time).observe(moon).apparent().frame_xyz_and_velocity(itrs)
    r_sun_earth = ecef_sunvec[0].au
    r_sun_earth = r_sun_earth / np.linalg.norm(r_sun_earth)
    r_moon_earth = ecef_moonvec[0].au
    r_moon = r_moon_earth / np.linalg.norm(r_moon_earth)
    rotX90 = np.array([[1, 0, 0], [0, 0, 1], [0, -1, 0]])
    return {
        'sun': (rotX90 @ r_sun_earth).tolist(),
        'moon': (rotX90 @ r_moon).tolist()
    }
