function hexToRgb(hex) {

    if (typeof hex === "number") {hex = hex.toString(16).padStart(6, "0");}
    if (hex.startsWith("#")) {hex = hex.slice(1);}
    if (hex.length === 3) {hex = hex.split("").map(char => char + char).join("");}
    if (hex.length !== 6) {throw new Error("Invalid HEX color format.");}
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return [r/255,g/255,b/255];
}

const vertexShader = `
    varying vec3 vPosition;
    uniform vec3 v3LightPosition;
    uniform vec3 cps;
    void main() {
        vPosition = position;
        vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * viewPosition;
    }
`
const fragmentShader = `
    varying vec3 vPosition;
    uniform vec3 cps;
    uniform vec3 v3LightPosition;
    uniform vec3 color;
    void main() {
        float lightIntensity = max(dot(normalize(v3LightPosition), normalize(vPosition)), 0.0);
        float viewIntensity = max(dot(normalize(cps), normalize(vPosition)), 0.0);
        //vec3 atmosphereColor = mix(vec3(0.0, 0.5, 1.0), vec3(0.8, 0.8, 1.0), lightIntensity);
        vec3 lightColor = normalize(color + 5.0);
        float maxlightColor = 1.2*max(max(lightColor.x, lightColor.y), lightColor.z);
        lightColor /= maxlightColor;
        vec3 atmosphereColor = mix(color, lightColor, lightIntensity);
        vec3 finalColor = mix(atmosphereColor, vec3(1.0, 1.0, 1.0), viewIntensity);
        gl_FragColor = vec4(finalColor, lightIntensity);
    }
`
const vertexPlanet = `
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vSunDir;
uniform vec3 v3LightPosition;
void main() {
    vUv = uv;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vNormal = normalMatrix * normal;
    vSunDir = mat3(viewMatrix) * v3LightPosition;
    gl_Position = projectionMatrix * mvPosition;
}
`

const fragmentPlanet = `
uniform sampler2D day_Texture;
uniform sampler2D night_Texture;
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vSunDir;
void main(void) {
    vec3 t0 = texture2D( day_Texture, vUv ).rgb; // day
    vec3 t1 = texture2D( night_Texture, vUv ).rgb; // night
    float NdotL = dot(normalize(vNormal), normalize(vSunDir));
    float y = smoothstep(-0.2, 0.2, NdotL);
    vec3 final_color = t0 * y + t1 * (1.0-y);
    gl_FragColor = vec4(final_color, 1.0);
}
`

class Planet extends Mesh {
    constructor( r, colorHex, cam ) 
    {
        const PlanetUniforms = {
            v3LightPosition:{
                type: "v3",
                value: new Vector3(1,0,0)
            },
            day_Texture: {
                type: "t",
                value: null
            }, 
            night_Texture: {
                type: "t",
                value: null
            }    
        };
        const mat = new ShaderMaterial({
            uniforms: PlanetUniforms,
            vertexShader: vertexPlanet,
            fragmentShader: fragmentPlanet});
        const geo = new SphereGeometry(r, 64, 64 );
        super( geo, mat );
        this.r = r;
        this.colorHex = colorHex;

        this.sunvect = new Vector3(1,0,0); 

        const colorRBG = hexToRgb(colorHex);
        const atmoPlanet = new ShaderMaterial({
            vertexShader,
            fragmentShader,
            uniforms: {
                v3LightPosition: { value: new Vector3(1,0,0) },
                cps: { value: cam.position },
                color: { value: new Vector3(colorRBG[0],colorRBG[1],colorRBG[2]) }
            },
            side: BackSide,
            transparent: true,
            depthWrite: false,
        });
        this.atm = new Mesh(
            new SphereGeometry(r*1.01, 64, 64), 
            atmoPlanet
        );
        scene.add(this.atm);
        const length = this.r*1.5;
        const arrowHelper = new ArrowHelper( 
            new Vector3( 0, 1, 0 ), 
            new Vector3( 0, 0, 0 ), 
            length, 
            this.colorHex );
        this.add( arrowHelper );
    }

    loadTextures( pathDay, pathNight, maxAnisotropy = 16) {
        const day_Texture = textureLoader.load(pathDay);
        const night_Texture = textureLoader.load(pathNight);
        day_Texture.anisotropy = maxAnisotropy; 
        night_Texture.anisotropy = maxAnisotropy;
        this.material.uniforms.day_Texture.value = day_Texture; 
        this.material.uniforms.night_Texture.value = night_Texture;
    }
    setSun( sun )
    {
        this.sunvect.copy(sun);
        this.material.uniforms.v3LightPosition.value =  this.sunvect;
        this.atm.material.uniforms.v3LightPosition.value =  this.sunvect;
    }
    setSunOrigin( )
    {
        this.sunvect.copy(this.position);
        this.sunvect.normalize().negate();
        this.material.uniforms.v3LightPosition.value =  this.sunvect;
        this.atm.material.uniforms.v3LightPosition.value =  this.sunvect;
    }
    setPosition( x, y, z ) {
        this.position.set(x, y, z);
    }
    setTilt( tilt ) {
        this.rotation.x = tilt;
    }    
    init( daypath, nightpath, sv, tilt, spriteMap ) {
        this.loadTextures(daypath, nightpath);
        this.setPosition(sv[0],sv[1],sv[2]);
        this.setSunOrigin();
        this.spriteRing = new Sprite( new SpriteMaterial( { 
            map: spriteMap, 
            color:this.colorHex,
            depthTest: false
        }));
        this.add(this.spriteRing);
        this.setTilt(tilt);
    }   
    updateFromRK4(r,spin){
        this.position.set(r.x,r.y,r.z);
        this.atm.position.set(r.x,r.y,r.z);
        this.rotation.y += spin;
        this.setSunOrigin();
    }
}

