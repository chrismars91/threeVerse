import numpy as np
from scipy.integrate import solve_ivp

G = 6.67430e-20  # m^3 kg^-1 s^-2

"""
    This Python file will solve future orbits using Runge-Kutta the a n-body gravity differential equation.

    Runge-Kutta simply needs the differential equation. In a second-order differential equation, like gravity, you can 
    split the second-order differential equation into two first-order coupled differential equations.
        
        For position, the differential equation is quite simple: ṙ = v. That's why you can simply pass 
        velocities.flatten(), as seen in the return statement from the derivatives function.        
        
"""


def derivatives(t, state, n_bodies, masses, scale):
    positions = state[:3 * n_bodies].reshape((n_bodies, 3))
    velocities = state[3 * n_bodies:].reshape((n_bodies, 3))
    accelerations = np.zeros_like(positions)
    for i in range(n_bodies):
        for j in range(i + 1, n_bodies):
            r_ij = positions[j] - positions[i]
            distance = np.linalg.norm(r_ij)
            force_magnitude = scale * G * masses[i] * masses[j] / distance ** 2
            force_direction = r_ij / distance
            force = force_magnitude * force_direction
            accelerations[i] += force / masses[i]
            accelerations[j] -= force / masses[j]
    return np.concatenate([velocities.flatten(), accelerations.flatten()])


def get_future_orbits_rk45(data: dict, n=5000, scale=1.0, pluto_scale=1.0):
    n_bodies = 11
    masses = np.array([
        1.989e30,  # Sun
        3.301e23,  # Mercury
        4.867e24,  # Venus
        5.972e24,  # Earth
        7.342e22,  # Moon
        6.417e23,  # Mars
        1.898e27,  # Jupiter
        5.683e26,  # Saturn
        8.681e25,  # Uranus
        1.024e26,  # Neptune
        1.309e22 * pluto_scale  # Pluto
    ])
    initial_positions = np.array([
        data['sun'][0:3],
        data['mercury'][0:3],
        data['venus'][0:3],
        data['earth'][0:3],
        data['moon'][0:3],
        data['mars'][0:3],
        data['jupiter'][0:3],
        data['saturn'][0:3],
        data['uranus'][0:3],
        data['neptune'][0:3],
        data['pluto'][0:3]
    ])
    initial_velocities = np.array([
        data['sun'][3:],
        data['mercury'][3:],
        data['venus'][3:],
        data['earth'][3:],
        data['moon'][3:],
        data['mars'][3:],
        data['jupiter'][3:],
        data['saturn'][3:],
        data['uranus'][3:],
        data['neptune'][3:],
        data['pluto'][3:]
    ])
    initial_state = np.concatenate([initial_positions.flatten(), initial_velocities.flatten()])
    t_span = (0, 2 * 365 * 24 * 60 * 60)  # One year in seconds
    t_eval = np.linspace(t_span[0], t_span[1], n)
    solution = solve_ivp(
        derivatives,
        t_span,
        initial_state,
        args=(n_bodies, masses, scale ** 3),
        method='RK45',
        t_eval=t_eval,
        rtol=1e-9,
        atol=1e-12
    )
    positions = solution.y[:3 * n_bodies].reshape((n_bodies, 3, -1))  # Positions over time
    return {
        'sun': positions[0].tolist(),
        'mercury': positions[1].tolist(),
        'venus': positions[2].tolist(),
        'earth': positions[3].tolist(),
        'moon': positions[4].tolist(),
        'mars': positions[5].tolist(),
        'jupiter': positions[6].tolist(),
        'saturn': positions[7].tolist(),
        'uranus': positions[8].tolist(),
        'neptune': positions[9].tolist(),
        'pluto': positions[10].tolist(),
    }
