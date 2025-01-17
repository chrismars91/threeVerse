    
const MOONR = 0.2727;

const MoonUniforms = {
    v3LightPosition:{
        type: "v3",
        value: new Vector3(1,0,0)
    },
    MoonDayTexture: {
        type: "t",
        value: null
    }, 
    MoonNightTexture: {
        type: "t",
        value: null
    }    
};


const vertexMoon = `
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

const fragmentMoon = `
uniform sampler2D MoonDayTexture;
uniform sampler2D MoonNightTexture;
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vSunDir;
void main(void) {
    vec3 t0 = texture2D( MoonDayTexture, vUv ).rgb; // day
    vec3 t1 = texture2D( MoonNightTexture, vUv ).rgb; // night
    float NdotL = dot(normalize(vNormal), normalize(vSunDir));
    float y = smoothstep(-0.2, 0.2, NdotL);
    vec3 final_color = t0 * y + t1 * (1.0-y);
    gl_FragColor = vec4(final_color, 1.0);
}
`


class Moon extends Mesh {

    constructor( ) 
    {
        const moonMaterial = new ShaderMaterial(
        {uniforms: MoonUniforms,vertexShader: vertexMoon,fragmentShader: fragmentMoon});
        const moonGeometry = new SphereGeometry(MOONR, 64, 64 );
        super( moonGeometry, moonMaterial );

        const ringGeometry = new BufferGeometry();
        const ringVertices = [];
        for (let i = 0; i < 200; i++)
        {
            const t = i*2*Math.PI/(199);
            ringVertices.push(MOONR*2*Math.cos(t),MOONR*2*Math.sin(t),0);
        };     
        ringGeometry.setAttribute( 'position', new Float32BufferAttribute( ringVertices, 3 ) );
        this.ring = new Line( ringGeometry, new LineBasicMaterial( {color: 0xADD8E6 }));  
        this.add(this.ring);   
        this.ring.visible = false;
        this.sunvect = new Vector3(1,0,0); 
    }

    loadTextures( pathDay, pathNight, maxAnisotropy = 16) {
        const MoonDayTexture = textureLoader.load(pathDay);
        const MoonNightTexture = textureLoader.load(pathNight);
        MoonDayTexture.anisotropy = maxAnisotropy; 
        MoonNightTexture.anisotropy = maxAnisotropy;
        MoonUniforms.MoonDayTexture.value = MoonDayTexture; 
        MoonUniforms.MoonNightTexture.value = MoonNightTexture;
    }
    setSun( sun )
    {
        this.sunvect.copy(sun);
        this.material.uniforms.v3LightPosition.value =  this.sunvect;
    }
    setPosition( x, y, z ) {
        this.position.set(x, y, z);
        this.ring.position.set(x, y, z);
        this.ring.position.sub(this.position);
        this.ring.lookAt(0,0,0);
    }
}




