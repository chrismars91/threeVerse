from skyfield.api import load
import numpy as np
from skyfield.framelib import ecliptic_frame, itrs

"""
The sole purpose of this function is to rotate the Earth so that, when the simulation loads, 
the night and day shadows (via shader code) are kinda accurate.

This is a jumble of vectors and, honestly, reflects my thought process in code. I’m not sure if this is correct.

To accomplish this (I think), we need to:

    Get the Sun-to-Earth vector in the ecliptic frame; let’s call this sun__earth__ecliptic.
    Get the Sun-to-Earth vector in the ITRS frame; let’s call this sun__earth__itrs.
    The ITRS frame is the ECEF frame, which "captures" the Earth's rotation as it is time-dependent.
    Rotate the sun__earth__ecliptic vector so that it shares the same "up" vector as the ecliptic.
    This can (I think) be done because the ecliptic frame needs to be rotated only along the x-axis to align with the 
        "up" vector.
    Find the rotations between the x and y components, as now both vectors share the same "up" vector (z-axis).
"""


def ecliptic_celestial_north_rotation(skyfield_time):
    ecliptic_rotation = ecliptic_frame.rotation_at(skyfield_time)
    planets = load('de421.bsp')
    r_itrs = planets["earth"].at(skyfield_time) - planets["sun"].at(skyfield_time)
    r_itrs = r_itrs.frame_xyz(itrs).au
    r_itrs = r_itrs / np.linalg.norm(r_itrs)
    r_ecliptic = planets["earth"].at(skyfield_time) - planets["sun"].at(skyfield_time)
    r_ecliptic = r_ecliptic.frame_xyz(ecliptic_frame).au
    r_ecliptic = r_ecliptic / np.linalg.norm(r_ecliptic)
    north_ecliptic = ecliptic_rotation @ np.array([0, 0, 1])
    angle_obliquity = np.arccos(north_ecliptic[2] / (np.sum(north_ecliptic ** 2) ** .5))  # * 180 / np.pi
    theta = -angle_obliquity
    cos_theta = np.cos(theta)
    sin_theta = np.sin(theta)
    rx = np.array([
        [1, 0, 0],
        [0, cos_theta, -sin_theta],
        [0, sin_theta, cos_theta]
    ])
    r_ecliptic_rotated_z = r_ecliptic @ rx
    # print(f"check, should ~zero: {abs(np.round(r_ecliptic_rotated_z[2] - r_itrs[2], 3))}")
    u = np.copy(r_ecliptic_rotated_z)
    v = np.copy(r_itrs)
    dot_product = np.dot(u, v)
    norm_u = np.linalg.norm(u)
    norm_v = np.linalg.norm(v)
    cos_theta = dot_product / (norm_u * norm_v)
    cos_theta = np.clip(cos_theta, -1.0, 1.0)
    angle_radians = np.arccos(cos_theta)
    # angle_degrees = np.degrees(angle_radians)
    return angle_radians
