import './style.css'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import * as dat from 'dat.gui'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import { RectAreaLightHelper } from 'three/examples/jsm/helpers/RectAreaLightHelper.js'

/**
 * Base
 */
// Debug
// const gui = new dat.GUI()

/**
 * Textures
 */
const textureLoader = new THREE.TextureLoader()
const particlesTexture = textureLoader.load('/textures/particles/2.png')

/**
 * Models
 */

// Canvas
const canvas = document.querySelector('canvas.webgl')

// Scene
const scene = new THREE.Scene()
const sceneBackgroundColor = new THREE.Color("rgb(13, 11, 15)");
scene.background = sceneBackgroundColor
// scene.background.addColors(sceneBackgroundColor)


const dracoLoader = new DRACOLoader()
dracoLoader.setDecoderPath('/draco/')

const gltfLoader = new GLTFLoader()
gltfLoader.setDRACOLoader(dracoLoader)


let mixer = null

gltfLoader.load(
    '/space_man/scene.gltf',
    (gltf) => 
    {
        mixer = new THREE.AnimationMixer(gltf.scene)

        //Standing
        const action1 = mixer.clipAction(gltf.animations[2])

        // const action2 = mixer.clipAction(gltf.animations[6])
        // const action3 = mixer.clipAction(gltf.animations[6])

        action1.play()

        gltf.scene.scale.set(0.0050,0.0050,0.0050)
        gltf.scene.position.set(0,-5.6, 1.1)
        scene.add(gltf.scene)
    }
 )

//  gltfLoader.load(
//     '/cartoon_rocket/scene.gltf',
//     (gltf) => 
//     {
//         gltf.scene.scale.set(0.025,0.025,0.025)
//         scene.add(gltf.scene)
//     }
//  )

 

// Move Camera
const cursor = {
    x: 0,
    y: 0
}

// Mouse Position
window.addEventListener('mousemove', (event) => {
    cursor.x = event.clientX / sizes.width - 0.5
    cursor.y = - (event.clientY / sizes.height - 0.5)
    console.log(cursor.x)
    console.log(cursor.y)
})

/**
 * Lights
 */

// lights everything uniformally
// very performant
const ambientLight = new THREE.AmbientLight(0xffffff,0.5)
scene.add(ambientLight)


// Like the sun
// medium performant
const directionalLight = new THREE.DirectionalLight(0x0000ff,0.5)
directionalLight.position.set(1,0.25,0)
scene.add(directionalLight)

// first colour from top, second color from the bottom
// very performant
const hemisphereLight = new THREE.HemisphereLight(0xff0000,0x0000ff,1)
scene.add(hemisphereLight)

// inviately small point light
// medium performant
const pointlight = new THREE.PointLight(0xff9000,3,10, 2)
pointlight.position.set(-3,1,0)
scene.add(pointlight, ambientLight)



// only works with mesh phyiscal and mesh standard materials
// low performance
const rectAreaLight = new THREE.RectAreaLight(0x4e00ff, 5,10,10)
rectAreaLight.position.set(3,2,-3)
rectAreaLight.lookAt(new THREE.Vector3())
scene.add(rectAreaLight)


//
// gui.add(pointlight,'intensity').min(0).max(10).step(0.01)
// gui.add(ambientLight,'intensity').min(0).max(10).step(0.01)


// // Light Helpers
// const hemisphereLightHelper = new THREE.HemisphereLightHelper(hemisphereLight,0.2)
// scene.add(hemisphereLightHelper)
// const directionalLightHelper = new THREE.DirectionalLightHelper(directionalLight,0.2)
// scene.add(directionalLightHelper)
// const pointlightHelper = new THREE.PointLightHelper(pointlight,0.2)
// scene.add(pointlightHelper)
// const rectAreaLightHelper = new RectAreaLightHelper(rectAreaLight)
// scene.add(rectAreaLightHelper)

 /**
 * Particles
 */

// Geometry
const particlesGeometry = new THREE.BufferGeometry()
const count = 10000

const postions = new Float32Array(count * 3)
const colors = new Float32Array(count * 3)


for(let i = 0; i < postions.length; i++){
    postions[i] = (Math.random()- 0.5) * 25
    colors[i] = Math.random()
}

particlesGeometry.setAttribute(
    'position',
    new THREE.BufferAttribute(postions, 3)
)

particlesGeometry.setAttribute(
    'color',
    new THREE.BufferAttribute(colors, 3)
)


// Material
const particlesMaterial = new THREE.PointsMaterial({
    // color: 'pink',
    size: 0.1,
    sizeAttenuation: true //if close to camera will be big and if far away will be small.
})
particlesMaterial.transparent = true
particlesMaterial.alphaMap = particlesTexture
// particlesMaterial.alphaTest = 0.001  //1. remove strange black square
// particlesMaterial.depthTest = false //1. remove strange black square, but can see through all objects
particlesMaterial.depthWrite = false //1. remove strange black square
particlesMaterial.blending = THREE.AdditiveBlending // This one has a performance impact
particlesMaterial.vertexColors = true


// Points
const particles = new THREE.Points(
    particlesGeometry,
    particlesMaterial
)

scene.add(particles)

/**
 * Mesh 
 */
const sphereMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff
})

sphereMaterial.roughness = 0.7

const testSphere = new THREE.Mesh(
    new THREE.SphereGeometry(1, 6, 6),
    new THREE.MeshStandardMaterial({
        color: 'purple',
        wireframe: true
    })
)

testSphere.position.y = 0
testSphere.position.x = 0
testSphere.position.z = 0

//Cone Mesh
const geometry = new THREE.ConeGeometry( 0.5, 1, 10 );
const material = new THREE.MeshStandardMaterial( { color: 0xff0000 } );
const material_1 = new THREE.MeshStandardMaterial( { color: 0xC500B6 } );
const material_2 = new THREE.MeshStandardMaterial( { color: 0x9700E7 } );
const material_3 = new THREE.MeshStandardMaterial( { color: 0xDA0202 } );
const material_4 = new THREE.MeshStandardMaterial( { color: 0x4504FF } );
const cone = new THREE.Mesh(geometry, material);
cone.position.x = -4
cone.position.y = 0.66
cone.position.z = 0


//Box Geometry and Material
const boxGeometry = new THREE.BoxBufferGeometry( 1, 1, 1 );

//Box Mesh 2
const cube2 = new THREE.Mesh( boxGeometry, material_4 );
cube2.position.x = 3
cube2.position.z = 0
cube2.position.y = -0.66

const cylinderGeometry = new THREE.CylinderGeometry(1,1,2,10 );
const cylinder = new THREE.Mesh( cylinderGeometry, material_2 );
cylinder.position.x = -5
cylinder.position.z = -3
cylinder.position.y = -2
scene.add(cylinder);


// Werid Sphere
const sphere2Geometry = new THREE.SphereGeometry( 1, .3, 50, 12 );
const sphere2 = new THREE.Mesh( sphere2Geometry, material_2 );
sphere2.position.x = -13
sphere2.position.z = -3
sphere2.position.y = -6
scene.add( sphere2 );

//Octahedron
const octahedronGeometry = new THREE.OctahedronGeometry(2);
const octahedron = new THREE.Mesh( octahedronGeometry, material_4 );
octahedron.position.x = -10
octahedron.position.z = -5
octahedron.position.y = -11
scene.add( octahedron );

//torusKnot
const torusKnotGeometry = new THREE.TorusKnotGeometry( 1, .3, 50, 12 );
const torusKnot = new THREE.Mesh( torusKnotGeometry, material_2);
torusKnot.position.x = 10
torusKnot.position.z = -5
torusKnot.position.y = -6
scene.add( torusKnot );


/**
 * Add Meshes to scene
 */
 scene.add(cone,cube2, testSphere /*, particlesMesh*/);


/**
 * Window Sizes
 */
const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
}

window.addEventListener('resize', () =>
{
    // Update sizes
    sizes.width = window.innerWidth
    sizes.height = window.innerHeight

    // Update camera
    camera.aspect = sizes.width / sizes.height
    camera.updateProjectionMatrix()

    // Update renderer
    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
})



/**
 * Camera
 */

// Base camera
const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 100)
camera.position.set(0, 0, 6)
scene.add(camera)

// const controls = new OrbitControls(camera, canvas)
// controls.enableDamping = true
/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({
    canvas: canvas
})

renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

/**
 * Animate
 */

const clock = new THREE.Clock()
let previousTime = 0

const tick = () =>
{
    const elapsedTime = clock.getElapsedTime()
    const deltaTime = elapsedTime - previousTime
    previousTime = elapsedTime
    

    // Update Animation Mixer
    if(mixer !== null){
        mixer.update(deltaTime)
    }

    // Rotations
    testSphere.rotation.y = 0.1 * elapsedTime
    testSphere.rotation.x = 0.15 * elapsedTime
    cube2.rotation.y = 0.5 * elapsedTime
    cube2.rotation.x = 0.15 * elapsedTime
    cone.rotation.y = 0.7 * elapsedTime
    cone.rotation.x = - (0.7 * elapsedTime)
    cone.rotation.z = - (0.1 * elapsedTime)
    cylinder.rotation.y = 0.4 * elapsedTime
    cylinder.rotation.x = 0.50 * elapsedTime
    octahedron.rotation.y = -0.3 * elapsedTime
    octahedron.rotation.x = 0.16 * elapsedTime
    sphere2.rotation.y = 0.4 * elapsedTime
    sphere2.rotation.x = 0.50 * elapsedTime
    torusKnot.rotation.y = 0.4 * elapsedTime
    torusKnot.rotation.x = 0.50 * elapsedTime


    // Update controls
    // controls.update()

    // Update Sphere
    camera.position.x = - cursor.x * 1.2
    camera.position.y = - cursor.y * 1.2

    const cameraVector3 = new THREE.Vector3(
        testSphere.position.x, 
        testSphere.position.y - 2, 
        testSphere.position.z,
    )

    // camera.lookAt(cameraVector3)
    camera.lookAt(cameraVector3)

    // Render
    renderer.render(scene, camera)

    // Call tick again on the next frame
    window.requestAnimationFrame(tick)

}

tick()