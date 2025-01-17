class Lensflare extends Mesh {

    constructor() {

        super( Lensflare.Geometry, new MeshBasicMaterial( { opacity: 0, transparent: true } ) );

        this.isLensflare = true;

        this.type = 'Lensflare';
        this.frustumCulled = false;
        this.renderOrder = Infinity;

        //

        const positionScreen = new Vector3();
        const positionView = new Vector3();

        // textures

        const tempMap = new FramebufferTexture( 16, 16 );
        const occlusionMap = new FramebufferTexture( 16, 16 );

        let currentType = UnsignedByteType;

        // material

        const geometry = Lensflare.Geometry;

        const material1a = new RawShaderMaterial( {
            uniforms: {
                'scale': { value: null },
                'screenPosition': { value: null }
            },
            vertexShader: /* glsl */`

                precision highp float;

                uniform vec3 screenPosition;
                uniform vec2 scale;

                attribute vec3 position;

                void main() {

                    gl_Position = vec4( position.xy * scale + screenPosition.xy, screenPosition.z, 1.0 );

                }`,

            fragmentShader: /* glsl */`

                precision highp float;

                void main() {

                    gl_FragColor = vec4( 1.0, 0.0, 1.0, 1.0 );

                }`,
            depthTest: true,
            depthWrite: false,
            transparent: false
        } );

        const material1b = new RawShaderMaterial( {
            uniforms: {
                'map': { value: tempMap },
                'scale': { value: null },
                'screenPosition': { value: null }
            },
            vertexShader: /* glsl */`

                precision highp float;

                uniform vec3 screenPosition;
                uniform vec2 scale;

                attribute vec3 position;
                attribute vec2 uv;

                varying vec2 vUV;

                void main() {

                    vUV = uv;

                    gl_Position = vec4( position.xy * scale + screenPosition.xy, screenPosition.z, 1.0 );

                }`,

            fragmentShader: /* glsl */`

                precision highp float;

                uniform sampler2D map;

                varying vec2 vUV;

                void main() {

                    gl_FragColor = texture2D( map, vUV );

                }`,
            depthTest: false,
            depthWrite: false,
            transparent: false
        } );

        // the following object is used for occlusionMap generation

        const mesh1 = new Mesh( geometry, material1a );

        //

        const elements = [];

        const shader = LensflareElement.Shader;

        const material2 = new RawShaderMaterial( {
            name: shader.name,
            uniforms: {
                'map': { value: null },
                'occlusionMap': { value: occlusionMap },
                'color': { value: new Color( 0xffffff ) },
                'scale': { value: new Vector2() },
                'screenPosition': { value: new Vector3() }
            },
            vertexShader: shader.vertexShader,
            fragmentShader: shader.fragmentShader,
            blending: AdditiveBlending,
            transparent: true,
            depthWrite: false
        } );

        const mesh2 = new Mesh( geometry, material2 );

        this.addElement = function ( element ) {

            elements.push( element );

        };

        //

        const scale = new Vector2();
        const screenPositionPixels = new Vector2();
        const validArea = new Box2();
        const viewport = new Vector4();

        this.onBeforeRender = function ( renderer, scene, camera ) {

            renderer.getCurrentViewport( viewport );

            const renderTarget = renderer.getRenderTarget();
            const type = ( renderTarget !== null ) ? renderTarget.texture.type : UnsignedByteType;

            if ( currentType !== type ) {

                tempMap.dispose();
                occlusionMap.dispose();

                tempMap.type = occlusionMap.type = type;

                currentType = type;

            }

            const invAspect = viewport.w / viewport.z;
            const halfViewportWidth = viewport.z / 2.0;
            const halfViewportHeight = viewport.w / 2.0;

            let size = 16 / viewport.w;
            scale.set( size * invAspect, size );

            validArea.min.set( viewport.x, viewport.y );
            validArea.max.set( viewport.x + ( viewport.z - 16 ), viewport.y + ( viewport.w - 16 ) );

            // calculate position in screen space

            positionView.setFromMatrixPosition( this.matrixWorld );
            positionView.applyMatrix4( camera.matrixWorldInverse );

            if ( positionView.z > 0 ) return; // lensflare is behind the camera

            positionScreen.copy( positionView ).applyMatrix4( camera.projectionMatrix );

            // horizontal and vertical coordinate of the lower left corner of the pixels to copy

            screenPositionPixels.x = viewport.x + ( positionScreen.x * halfViewportWidth ) + halfViewportWidth - 8;
            screenPositionPixels.y = viewport.y + ( positionScreen.y * halfViewportHeight ) + halfViewportHeight - 8;

            // screen cull

            if ( validArea.containsPoint( screenPositionPixels ) ) {

                // save current RGB to temp texture

                renderer.copyFramebufferToTexture( tempMap, screenPositionPixels );

                // render pink quad

                let uniforms = material1a.uniforms;
                uniforms[ 'scale' ].value = scale;
                uniforms[ 'screenPosition' ].value = positionScreen;

                renderer.renderBufferDirect( camera, null, geometry, material1a, mesh1, null );

                // copy result to occlusionMap

                renderer.copyFramebufferToTexture( occlusionMap, screenPositionPixels );

                // restore graphics

                uniforms = material1b.uniforms;
                uniforms[ 'scale' ].value = scale;
                uniforms[ 'screenPosition' ].value = positionScreen;

                renderer.renderBufferDirect( camera, null, geometry, material1b, mesh1, null );

                // render elements

                const vecX = - positionScreen.x * 2;
                const vecY = - positionScreen.y * 2;

                for ( let i = 0, l = elements.length; i < l; i ++ ) {

                    const element = elements[ i ];

                    const uniforms = material2.uniforms;

                    uniforms[ 'color' ].value.copy( element.color );
                    uniforms[ 'map' ].value = element.texture;
                    uniforms[ 'screenPosition' ].value.x = positionScreen.x + vecX * element.distance;
                    uniforms[ 'screenPosition' ].value.y = positionScreen.y + vecY * element.distance;

                    size = element.size / viewport.w;
                    const invAspect = viewport.w / viewport.z;

                    uniforms[ 'scale' ].value.set( size * invAspect, size );

                    material2.uniformsNeedUpdate = true;

                    renderer.renderBufferDirect( camera, null, geometry, material2, mesh2, null );

                }

            }

        };

        this.dispose = function () {

            material1a.dispose();
            material1b.dispose();
            material2.dispose();

            tempMap.dispose();
            occlusionMap.dispose();

            for ( let i = 0, l = elements.length; i < l; i ++ ) {

                elements[ i ].texture.dispose();

            }

        };

    }

}

//

class LensflareElement {

    constructor( texture, size = 1, distance = 0, color = new Color( 0xffffff ) ) {

        this.texture = texture;
        this.size = size;
        this.distance = distance;
        this.color = color;

    }

}

LensflareElement.Shader = {

    name: 'LensflareElementShader',

    uniforms: {

        'map': { value: null },
        'occlusionMap': { value: null },
        'color': { value: null },
        'scale': { value: null },
        'screenPosition': { value: null }

    },

    vertexShader: /* glsl */`

        precision highp float;

        uniform vec3 screenPosition;
        uniform vec2 scale;

        uniform sampler2D occlusionMap;

        attribute vec3 position;
        attribute vec2 uv;

        varying vec2 vUV;
        varying float vVisibility;

        void main() {

            vUV = uv;

            vec2 pos = position.xy;

            vec4 visibility = texture2D( occlusionMap, vec2( 0.1, 0.1 ) );
            visibility += texture2D( occlusionMap, vec2( 0.5, 0.1 ) );
            visibility += texture2D( occlusionMap, vec2( 0.9, 0.1 ) );
            visibility += texture2D( occlusionMap, vec2( 0.9, 0.5 ) );
            visibility += texture2D( occlusionMap, vec2( 0.9, 0.9 ) );
            visibility += texture2D( occlusionMap, vec2( 0.5, 0.9 ) );
            visibility += texture2D( occlusionMap, vec2( 0.1, 0.9 ) );
            visibility += texture2D( occlusionMap, vec2( 0.1, 0.5 ) );
            visibility += texture2D( occlusionMap, vec2( 0.5, 0.5 ) );

            vVisibility =        visibility.r / 9.0;
            vVisibility *= 1.0 - visibility.g / 9.0;
            vVisibility *=       visibility.b / 9.0;

            gl_Position = vec4( ( pos * scale + screenPosition.xy ).xy, screenPosition.z, 1.0 );

        }`,

    fragmentShader: /* glsl */`

        precision highp float;

        uniform sampler2D map;
        uniform vec3 color;

        varying vec2 vUV;
        varying float vVisibility;

        void main() {

            vec4 texture = texture2D( map, vUV );
            texture.a *= vVisibility;
            gl_FragColor = texture;
            gl_FragColor.rgb *= color;

        }`

};

Lensflare.Geometry = ( function () {

    const geometry = new BufferGeometry();

    const float32Array = new Float32Array( [
        - 1, - 1, 0, 0, 0,
        1, - 1, 0, 1, 0,
        1, 1, 0, 1, 1,
        - 1, 1, 0, 0, 1
    ] );

    const interleavedBuffer = new InterleavedBuffer( float32Array, 5 );

    geometry.setIndex( [ 0, 1, 2,   0, 2, 3 ] );
    geometry.setAttribute( 'position', new InterleavedBufferAttribute( interleavedBuffer, 3, 0, false ) );
    geometry.setAttribute( 'uv', new InterleavedBufferAttribute( interleavedBuffer, 2, 3, false ) );

    return geometry;

} )();

class Sun extends Lensflare {
    constructor() {
        super()
        this.dirlight = new HemisphereLight( 0xFFAA00, 0x00AAFF, 1 );
        this.textureLoader = new TextureLoader(); 
        this.posNorm = new Vector3();
        this.add(this.dirlight);
    }
    loadFlare( path, size1, size2 ) {
        const tex = this.textureLoader.load(path);
        this.addElement(new LensflareElement(tex, size1, size2));
    }
    setPosition( x, y, z ) {
        this.position.set(x, y, z);
        this.dirlight.position.set(x, y, z);
        this.posNorm.copy(this.position);
        this.posNorm.normalize();
    }
    setModelOne(suntex, flareCircle, flareHex)
    {
        this.loadFlare(suntex, 500/3, 0);
        this.loadFlare(flareHex, 120, 1.0);
        this.loadFlare(flareCircle, 20, 0.96);
        this.loadFlare(flareCircle, 60, 0.95);
        this.loadFlare(flareHex, 140, 0.85);
    }
}



// // const sunTexture = texture.load("{{url_for('static',filename='img/lens_flare_2.jpeg')}}");
// // const sunCirle = texture.load("{{url_for('static',filename='img/lens_flare_circle_64x64.jpeg')}}");
// // const sunHex = texture.load("{{url_for('static',filename='img/lens_flare_hexagon_256x256.jpeg')}}");
// // const sun = new Sun();
// // sun.loadFlare(sunTexture, 1000, 0);
// // sun.loadFlare(sunHex, 60, 1.0);
// // sun.loadFlare(sunCirle, 10, 0.96);
// // sun.loadFlare(sunCirle, 30, 0.95);
// // sun.loadFlare(sunHex, 70, 0.85);
// // sun.position.set(pd.sunpx[0], pd.sunpx[1], pd.sunpx[2]);
// // group.add(sun);
// // group.add(sun.dirlight);
// // sun.dirlight.position.set(pd.sunpx[0], pd.sunpx[1], pd.sunpx[2])

class StarPoints extends Points {
    constructor( N, sprite = null )
    {
        const color1 = [0.678, 0.847, 0.902];
        const color2 = [1, 0.784, 0.588];
        const color3 = [1, 1, 1];
        const lists = [color1, color2, color3];
        const colors = [];
        const vertices = [];
        const visibility = [];
        const sizes = [];
        const v = new Vector3();
        for (let i = 0; i < N; i++)
        {
            v.set(randomGaussian(),randomGaussian(),randomGaussian());
            v.normalize().multiplyScalar(1000);
            vertices.push( v.x, v.y, v.z);
            const randomColorIndex = Math.floor(Math.random() * lists.length);
            const chosenColor = lists[randomColorIndex];
            colors.push(chosenColor[0],chosenColor[1],chosenColor[2]);
            visibility.push(1);
            sizes.push(2*Math.random()+1);
        }
        const geometry = new BufferGeometry();
        geometry.setAttribute( 'position', new Float32BufferAttribute( vertices, 3 ) );
        geometry.setAttribute( 'color', new Float32BufferAttribute( colors, 3 ) );
        const material = new PointsMaterial({
            map : sprite ,
            size: 5.0,
            blending: AdditiveBlending,
            vertexColors: true,
            transparent: true,
            depthWrite: false,
            onBeforeCompile: function(shader){
                shader.vertexShader = `
                attribute float sizes;
                attribute float visibility;
                varying float vVisible;
                ${shader.vertexShader}`
                .replace(
                    `gl_PointSize = size;`,
                    `gl_PointSize = size * sizes;
                    vVisible = visibility;
                    `
                );
                shader.fragmentShader = `
                varying float vVisible;
                ${shader.fragmentShader}`
                .replace(
                    `#include <clipping_planes_fragment>`,
                    `
                    if (vVisible < 0.5) discard;
                    #include <clipping_planes_fragment>`
                )
            }
        });

        super( geometry, material );
        this.geo = geometry;
        this.positionAttribute = this.geo.getAttribute( 'position' );
        // this.positionAttribute.needsUpdate = true;
        this.posArray = this.positionAttribute.array;
        this.colorAttribute = this.geo.getAttribute( 'color' );
        this.colorArray = this.colorAttribute.array;
        // this.colorAttribute.needsUpdate = true;

        // from shader code
        this.geo.setAttribute("visibility", new Float32BufferAttribute(visibility, 1));
        this.visibilityAttribute = this.geo.getAttribute( 'visibility' );
        this.visibilityArray = this.visibilityAttribute.array;
        // this.visibilityAttribute.needsUpdate = true;
        this.geo.setAttribute("sizes", new Float32BufferAttribute(sizes, 1));
        this.sizeAttribute = this.geo.getAttribute( 'sizes' );
        // this.sizeAttribute.needsUpdate = true;
        this.sizeArray = this.sizeAttribute.array;
        //
        // this.renderOrder = 1;


        this.timer = .1;
        this.time = 0;
        this.N = N;
    }
    posUpdate() {this.positionAttribute.needsUpdate = true;}
    colorUpdate() {this.colorAttribute.needsUpdate = true;}
    sizeUpdate() {this.sizeAttribute.needsUpdate = true;}
    visUpdate() {this.visibilityAttribute.needsUpdate = true;}
    setPosIdx( idx, px, py, pz )
    {
        this.posArray[idx*3  ] = px;
        this.posArray[idx*3+1] = py;
        this.posArray[idx*3+2] = pz;
        this.visibilityArray[idx] = 1;
        this.positionAttribute.needsUpdate = true;
        this.visibilityAttribute.needsUpdate = true;
    }
    setColorIdx( idx, cx, cy, cz )
    {
        this.colorArray[idx*3  ] = cx;
        this.colorArray[idx*3+1] = cy;
        this.colorArray[idx*3+2] = cz;
        this.colorAttribute.needsUpdate = true;
    }
    setSizeIdx( idx, s )
    {
        this.sizeArray[idx ] = s;
        this.sizeAttribute.needsUpdate = true;
    }
    twinkle(dt)
    {
        this.time += dt;
        if (this.time > this.timer)
        {
            for(let i=0;i<this.N;i+=1)
            {
                const r = Math.random()*3000;
                if (r < 1){this.visibilityArray[i]=0;}
                else{this.visibilityArray[i]=1;}
                this.time = 0;
            }
        }
        this.visUpdate();
    }
}
