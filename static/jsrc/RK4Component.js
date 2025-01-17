const G = 6.67430e-20; // Gravitational constant (m^3 kg^-1 s^-2)
const scaleFactor = 1e-21; // scaled in python by 1e-7
/*

    if we scaled the distance by X and since bigG is untis of m^3 we need to muliply
    bigG by X^3

*/

function calculateAccelerations(positions) {
    const accelerations = positions.map(() => ({ ax: 0, ay: 0, az: 0 }));

    for (let i = 0; i < positions.length; i++) {
        for (let j = i + 1; j < positions.length; j++) {
            const dx = positions[j].x - positions[i].x;
            const dy = positions[j].y - positions[i].y;
            const dz = positions[j].z - positions[i].z;
            const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

            if (distance === 0) continue;

            // Compute gravitational force magnitude
            const forceMagnitude = scaleFactor*(G * bodies[i].mass * bodies[j].mass) / (distance * distance);

            // Compute accelerations
            const ax = (forceMagnitude * dx) / (distance * bodies[i].mass);
            const ay = (forceMagnitude * dy) / (distance * bodies[i].mass);
            const az = (forceMagnitude * dz) / (distance * bodies[i].mass);

            // Update accelerations
            accelerations[i].ax += ax;
            accelerations[i].ay += ay;
            accelerations[i].az += az;

            accelerations[j].ax -= ax * (bodies[i].mass / bodies[j].mass);
            accelerations[j].ay -= ay * (bodies[i].mass / bodies[j].mass);
            accelerations[j].az -= az * (bodies[i].mass / bodies[j].mass);
        }
    }

    return accelerations;
}

function cloneState(bodies) {
    return bodies.map(body => ({
        x: body.x,
        y: body.y,
        z: body.z,
        vx: body.vx,
        vy: body.vy,
        vz: body.vz,
        mass: body.mass,
    }));
}

function integrateStep(state, k, scale) {
    return state.map((body, i) => ({
        x: body.x + k[i].vx * scale,
        y: body.y + k[i].vy * scale,
        z: body.z + k[i].vz * scale,
        vx: body.vx + k[i].ax * scale,
        vy: body.vy + k[i].ay * scale,
        vz: body.vz + k[i].az * scale,
        mass: body.mass,
    }));
}

function rungeKutta4(bodies, dt) {

    const state = cloneState(bodies);

    const a1 = calculateAccelerations(state);
    const k1 = state.map((body, i) => ({
        vx: body.vx,
        vy: body.vy,
        vz: body.vz,
        ax: a1[i].ax,
        ay: a1[i].ay,
        az: a1[i].az,
    }));

    const stateK2 = integrateStep(state, k1, dt / 2);
    const a2 = calculateAccelerations(stateK2);
    const k2 = stateK2.map((body, i) => ({
        vx: body.vx,
        vy: body.vy,
        vz: body.vz,
        ax: a2[i].ax,
        ay: a2[i].ay,
        az: a2[i].az,
    }));

    const stateK3 = integrateStep(state, k2, dt / 2);
    const a3 = calculateAccelerations(stateK3);
    const k3 = stateK3.map((body, i) => ({
        vx: body.vx,
        vy: body.vy,
        vz: body.vz,
        ax: a3[i].ax,
        ay: a3[i].ay,
        az: a3[i].az,
    }));

    const stateK4 = integrateStep(state, k3, dt);
    const a4 = calculateAccelerations(stateK4);
    const k4 = stateK4.map((body, i) => ({
        vx: body.vx,
        vy: body.vy,
        vz: body.vz,
        ax: a4[i].ax,
        ay: a4[i].ay,
        az: a4[i].az,
    }));

    bodies.forEach((body, i) => {
        body.x += (dt / 6) * (k1[i].vx + 2 * k2[i].vx + 2 * k3[i].vx + k4[i].vx);
        body.y += (dt / 6) * (k1[i].vy + 2 * k2[i].vy + 2 * k3[i].vy + k4[i].vy);
        body.z += (dt / 6) * (k1[i].vz + 2 * k2[i].vz + 2 * k3[i].vz + k4[i].vz);

        body.vx += (dt / 6) * (k1[i].ax + 2 * k2[i].ax + 2 * k3[i].ax + k4[i].ax);
        body.vy += (dt / 6) * (k1[i].ay + 2 * k2[i].ay + 2 * k3[i].ay + k4[i].ay);
        body.vz += (dt / 6) * (k1[i].az + 2 * k2[i].az + 2 * k3[i].az + k4[i].az);
    });
}