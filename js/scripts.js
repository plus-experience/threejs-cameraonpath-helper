// Global Base
var scene, renderer;

// insert point into particular index in array
Array.prototype.insert = function (index, item) {
    this.splice(index, 0, item);
};

class firstPerson {
    constructor(mainCamera) {
        var that = this;

        // SET TO TRUE FOR HELPER
        this.debug = true;

        this.setupFirstPersonObject();
        this.setupCamera(mainCamera);

        /// wheel
        this.wheelInteraction = true;
        this.wheelVal = 0;

        // Spline Editor
        this.splineHelperObjects = [];
        this.splinePointsLength = 4;
        this.positions = [];
        this.point = new THREE.Vector3();

        this.pointer = new THREE.Vector2();
        this.onUpPosition = new THREE.Vector2();
        this.onDownPosition = new THREE.Vector2();

        this.can_detach = true;
        this.active_point = [];

        this.ARC_SEGMENTS = 200;
        this.spline_drag_geometry = new THREE.BoxGeometry(2, 2, 2);
        this.splines = {};

        this.clock = new THREE.Clock();

        if (this.debug) {
            var params = {
                addPoint: this.addPoint.bind(this),
                removePoint: this.removePoint.bind(this),
                exportSpline: this.exportSpline.bind(this),
                updateCamPath: this.updateCamPath.bind(this),
            };

            // GUI Spline editor
            this.gui = new dat.GUI();

            this.gui.add(params, 'addPoint');
            this.gui.add(params, 'removePoint');
            this.gui.add(params, 'exportSpline');
            this.gui.add(params, 'updateCamPath');
            this.gui.open();

            // Raycaster
            this.raycaster = new THREE.Raycaster();
            this.intersected = null;
        }

        // Controls
        if (this.cameraMode == 'orbitview' && this.debug) {
            this.setupOrbitControls();
        }

        if (this.debug) {
            this.transformControl = new THREE.TransformControls(this.nowCamera, renderer.domElement);
            // transformControl.addEventListener('change', render);
            this.transformControl.addEventListener('dragging-changed', function (event) {
                if (that.orbitControls) {
                    that.orbitControls.enabled = !event.value;
                }
            });
            scene.add(this.transformControl);

            this.transformControl.addEventListener('objectChange', function () {
                that.updateSplineOutline();
            });

            document.onpointerdown = this.onPointerDown.bind(this);
            document.onpointerup = this.onPointerUp.bind(this);
            document.onpointermove = this.onPointerMove.bind(this);
            document.onkeyup = this.onKeyUp.bind(this);
        }

        window.onresize = this.onResize.bind(this);
        document.onwheel = this.onWheel.bind(this);

        /*******
         * Curves
         *********/

        for (let i = 0; i < this.splinePointsLength; i++) {
            this.addSplineObject(this.positions[i]);
        }

        this.positions.length = 0;

        for (let i = 0; i < this.splinePointsLength; i++) {
            this.positions.push(this.splineHelperObjects[i].position);
        }

        const curve_geometry = new THREE.BufferGeometry();
        curve_geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(this.ARC_SEGMENTS * 3), 3));

        this.curve = new THREE.CatmullRomCurve3(this.positions);
        this.curve.curveType = 'catmullrom';
        this.curve.mesh = new THREE.Line(
            curve_geometry.clone(),
            new THREE.LineBasicMaterial({
                color: 0xff0000,
                opacity: 0.35,
            })
        );

        this.spline = this.curve;
        if (this.debug) {
            scene.add(this.spline.mesh);
        }

        // prettier-ignore
        this.curveRotation = new THREE.CatmullRomCurve3([
            new THREE.Vector3(this.toRad(0), this.toRad(0), this.toRad(0)), 
            new THREE.Vector3(this.toRad(0), this.toRad(0), this.toRad(0)), 
            new THREE.Vector3(this.toRad(0), this.toRad(0), this.toRad(0)),
            new THREE.Vector3(this.toRad(0), this.toRad(0), this.toRad(0)),
            new THREE.Vector3(this.toRad(0), this.toRad(0), this.toRad(0))
        ]);

        // prettier-ignore
        this.curvePosition = [
            new THREE.Vector3(8.651371224181645, 10.063362043540664, 10.440772510488214),
            new THREE.Vector3(11.470183032558054, 10.79725448516099, -81.07221813018634),
            new THREE.Vector3(-25.13906615057779, 36.816385951081436, -161.23000915241622),
            new THREE.Vector3(73.8410533018339, 10.250759824071327, -201.12704519449736),
            new THREE.Vector3(14.885786364440278, 18.466288909757136, -278.36870301016063)
        ];

        // resize();

        this.loadSplinePoints(this.curvePosition);
        this.createActivePath();
    }

    setupCamera(mainCamera) {
        this.firstPersonCamera = mainCamera ? mainCamera : new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 1, 2000);
        if (this.debug) {
            this.orbitCamera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 1, 2000);
            this.orbitCamera.position.set(0, 45, 190);
            this.orbitCamera.lookAt(0, -10, 0);
        }
        // firstpersonview / orbitview
        this.cameraMode = this.debug ? 'orbitview' : 'firstpersonview';
        this.nowCamera = this.cameraMode == 'orbitview' ? this.orbitCamera : this.firstPersonCamera;

        this.cameraQuaternion = this.nowCamera.quaternion.clone();
    }

    changeCamera(modetouse) {
        this.cameraMode = modetouse;
        console.log('change camera');
        if (this.cameraMode == 'orbitview' && !this.orbitControls) {
            // create orbit controls if not created yet
            setupOrbitControls();
        }
        if (this.cameraMode == 'firstpersonview') {
            this.orbitControls.enableRotate = false;
            this.orbitControls.enableZoom = false;
            this.orbitControls.enablePan = false;
        } else {
            this.orbitControls.enableRotate = true;
            this.orbitControls.enableZoom = true;
            this.orbitControls.enablePan = true;
        }
    }
    setupOrbitControls() {
        // console.log('create orbit');

        setTimeout(
            function () {
                this.orbitControls = new THREE.OrbitControls(this.orbitCamera, renderer.domElement);
                this.orbitControls.damping = 0.2;
            }.bind(this),
            300
        );
    }

    setupFirstPersonObject() {
        // Origin Object
        var objectGeometry = new THREE.BoxGeometry(1, 10, 1);
        var objectMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 1 });
        this.originObject = new THREE.Mesh(objectGeometry, objectMaterial);
        this.originObject.position.set(0, 9, 80);
        this.originObject.stepHeight = 0;
        this.originObject.originHeight = this.originObject.position.y;
        scene.add(this.originObject);
    }

    addSplineObject(position) {
        const spline_drag_material = new THREE.MeshBasicMaterial({ color: Math.random() * 0xffffff });
        const object = new THREE.Mesh(this.spline_drag_geometry, spline_drag_material);

        if (position) {
            object.position.copy(position);
        } else {
            // adding new points
            // console.log('adding new pt');
            object.position.x = Math.random() * 100 - 50;
            object.position.y = Math.random() * 50;
            object.position.z = Math.random() * 100 - 50;
        }

        if (this.debug) {
            scene.add(object);
        }
        this.splineHelperObjects.push(object);
        return object;
    }

    addPoint() {
        this.splinePointsLength++;

        var active_point_index = this.positions.indexOf(this.active_point.position);

        if (active_point_index >= 0) {
            console.log('add between', active_point_index);

            this.positions.insert(active_point_index, this.addSplineObject().position);
        } else {
            console.log('add last');
            this.positions.push(this.addSplineObject().position);
        }

        // console.log(positions, positions.length);
        this.updateSplineOutline();
    }

    removePoint() {
        if (this.splinePointsLength <= 4) {
            return;
        }

        // check if a point is selected
        var active_point_index = this.positions.indexOf(this.active_point.position);
        // console.log('before', active_point, active_point.position);
        this.splinePointsLength--;
        if (active_point_index >= 0) {
            // if point is selected, remove selected point
            var _point = this.active_point;

            this.positions.splice(active_point_index, 1);
            console.log('remove via select');
        } else {
            // if no point is selected, remove last point in array
            var _point = this.splineHelperObjects.pop();

            this.positions.pop();
            console.log('remove no select', _point);
        }

        if (this.transformControl.object === _point) this.transformControl.detach();
        scene.remove(_point);

        this.updateSplineOutline();
    }

    updateSplineOutline() {
        const position = this.spline.mesh.geometry.attributes.position;

        for (let i = 0; i < this.ARC_SEGMENTS; i++) {
            const t = i / (this.ARC_SEGMENTS - 1);
            this.spline.getPoint(t, this.point);
            position.setXYZ(i, this.point.x, this.point.y, this.point.z);
        }

        position.needsUpdate = true;
    }

    updateCamPath() {
        this.createActivePath();
    }

    exportSpline(forupdate) {
        const strplace = [];
        console.log('export', this);
        for (let i = 0; i < this.splinePointsLength; i++) {
            const p = this.splineHelperObjects[i].position;
            strplace.push(`new THREE.Vector3(${p.x}, ${p.y}, ${p.z})`);
        }

        const code = '[' + strplace.join(',\n\t') + ']';
        if (!forupdate) {
            prompt('copy and paste code', code);
        } else {
            return code;
        }
    }

    loadSplinePoints(new_positions) {
        while (new_positions.length > this.positions.length) {
            this.addPoint();
        }

        while (new_positions.length < this.positions.length) {
            this.removePoint();
        }

        for (let i = 0; i < this.positions.length; i++) {
            this.positions[i].copy(new_positions[i]);
        }

        this.updateSplineOutline();
    }

    createActivePath() {
        ///// draw active camera path

        // remove current line before adding new line
        if (this.curveObject) {
            scene.remove(this.curveObject);
        }
        const points = this.curve.getPoints(100);
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({ color: 0xff0000 });
        this.curveObject = new THREE.Line(geometry, material);
        this.curveObject.position.y = 2;
        if (this.debug) {
            scene.add(this.curveObject);
        }
    }

    updateSplineRender() {
        this.nowCamera = this.cameraMode == 'orbitview' ? this.orbitCamera : this.firstPersonCamera;
        const elapsedTime = this.clock.getElapsedTime();

        this.originObject.updateMatrixWorld();

        var cameraVector = this.nowCamera.getWorldDirection(new THREE.Vector3(0, 0, 0));
        var cameraAngle = Math.atan2(cameraVector.x, cameraVector.z);
        this.originObject.rotation.y = cameraAngle;

        // Path
        const deltaTime = elapsedTime * 0.1;
        const boxPosition = new THREE.Vector3();
        const boxNextPosition = new THREE.Vector3();

        this.curve.getPointAt(this.wheelInteraction ? this.wheelVal % 1 : deltaTime % 1, boxPosition);
        this.curve.getPointAt((this.wheelInteraction ? this.wheelVal : deltaTime + 0.01) % 1, boxNextPosition);
        this.originObject.position.set(this.curveObject.position.x + boxPosition.x, this.curveObject.position.y + boxPosition.y, this.curveObject.position.z + boxPosition.z);

        if (this.cameraMode == 'firstpersonview') {
            this.firstPersonCamera.position.x = this.originObject.position.x;
            this.firstPersonCamera.position.y = this.originObject.position.y + 1;
            this.firstPersonCamera.position.z = this.originObject.position.z;

            // Rotate
            const nowRotation = new THREE.Vector3();

            this.curveRotation.getPointAt(this.wheelInteraction ? this.wheelVal % 1 : deltaTime % 1, nowRotation);
            this.makeRotation(nowRotation);
        }
    }

    checkSplineIntersect() {
        this.raycaster.setFromCamera(this.pointer, this.nowCamera);
        const intersects = this.raycaster.intersectObjects(this.splineHelperObjects);

        if (intersects.length > 0) {
            const object = intersects[0].object;
            if (object !== this.transformControl.object) {
                this.active_point = object;
                this.transformControl.attach(object);
                // console.log(object);
                console.log('selected', object);
                this.can_detach = false;

                setTimeout(
                    function () {
                        this.can_detach = true;
                    }.bind(this),
                    300
                );
            }
        }
    }

    toRad(val) {
        return (val * Math.PI) / 180;
    }

    makeRotation(vec) {
        var cameraEuler = new THREE.Euler(vec.x, vec.y, vec.z, 'YXZ');
        var cameraQuaternion = new THREE.Quaternion().setFromEuler(cameraEuler);
        this.firstPersonCamera.quaternion.copy(cameraQuaternion);
    }

    onKeyUp(event) {
        var event = event || window.event;
        var keycode = event.keyCode;
        switch (keycode) {
            case 49: // 1 : camera
                this.changeCamera('firstpersonview');
                break;
            case 50: // 2 : camera2
                this.changeCamera('orbitview');
                break;
        }
    }

    onPointerDown(event) {
        if (event.target != renderer.domElement) return;

        this.onDownPosition.x = event.clientX;
        this.onDownPosition.y = event.clientY;
        this.checkSplineIntersect();
    }

    onPointerUp(event) {
        if (event.target != renderer.domElement) return;

        this.onUpPosition.x = event.clientX;
        this.onUpPosition.y = event.clientY;

        if (this.onDownPosition.distanceTo(this.onUpPosition) === 0 && this.can_detach) {
            this.transformControl.detach();

            console.log('detached, clear activepoint', this.onDownPosition.distanceTo(this.onUpPosition));
            this.active_point = [];
        }
    }

    onPointerMove(event) {
        this.pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
    }

    onWheel(event) {
        this.wheelVal += event.deltaY / 50000;
        if (this.wheelVal >= 0) {
        } else {
            this.wheelVal = 0;
        }
    }

    onResize() {
        console.log('resize inside class');
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(window.innerWidth, window.innerHeight);

        this.nowCamera.aspect = window.innerWidth / window.innerHeight;
        this.nowCamera.updateProjectionMatrix();
    }
}

//// CLASS ENDS HERE

function init() {
    // Dom
    var domWebGL = document.createElement('div');
    document.body.appendChild(domWebGL);

    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xffffff);

    // Renderer
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setClearColor(0x000000);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    domWebGL.appendChild(renderer.domElement);

    // Setup
    firstPersonInstance = new firstPerson();
}

function render() {
    // TO ADD -
    firstPersonInstance.updateSplineRender();
    // TO CHANGE - Use firstperson instance camera
    renderer.render(scene, firstPersonInstance.nowCamera);

    requestAnimationFrame(render);
}

window.onload = function () {
    init();
    render();
};
