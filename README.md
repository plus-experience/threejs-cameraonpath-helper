# Camera Tracking on Spline Helper

Helper tool to draw catmull spline curve for use with first person persepctive camera in three.js.

**Demo URL**:
http://plus-ex.com/_dev/faris/three/camera-editor/v3/

![wheeling](https://github.com/plus-experience/threejs-cameraonpath-helper/blob/master/wheeling.gif)


## Setup

- When initialising threejs scene, add instance :

```
// init threejs 
init() {
...

  firstPersonInstance = new  firstPerson();
  
...
}
```
- If camera already created, pass your camera as parameter into class:

	- `firstPersonInstance = new  firstPerson(camera);`


- Add spline update function to threejs render loop

```
function  render() {
	...
	
	// add this
	firstPersonInstance.updateSplineRender();

	// Use firstperson instance camera
	renderer.render(scene, firstPersonInstance.nowCamera);

	requestAnimationFrame(render);

}

```



**Spline points positions**
``` 
this.curvePosition = [...];
```

- Set spline points here
- Minimum 4 spline points is  necessary

**Spline camera rotation angles**
``` 
this.curveRotation = [...];
```
- Set rotation points here

## Debug Mode

To enable helper, enable debug state inside class constructor:
`this.debug = true`

**Keyboard Shortcuts**
- Key '0' - Show / Hide helper guides
- Key '1' - First person camera 
- Key '2' - Orbit controls camera


## Customising Methods

When in debug mode, you can move, add , remove points to the lines.

### Moving and updating existing points
1.  Click on a helper point to select it
2.  Drag to move the point
3. Click on `updateCamPath` in helper menu

![edit-point](https://github.com/plus-experience/threejs-cameraonpath-helper/blob/master/edit_update.gif)


### Adding new point at the end of line

1. Without selecting any points, click on `addPoint` in helper menu
2. Click on `updateCamPath` in helper menu

![add-point-end](https://github.com/plus-experience/threejs-cameraonpath-helper/blob/master/add-point_end.gif)

### Adding new point between selected points

1.  Select a point you want to add an extra point, 
2.  Click on `addPoint` in helper menu
3. Click on `updateCamPath` in helper menu

![add-point-select](https://github.com/plus-experience/threejs-cameraonpath-helper/blob/master/add-point_end.gif)

### Remove point at the end of line

1.  Without selecting any points, click on `removePoint` in helper menu
2. Click on `updateCamPath` in helper menu

![remove-point-end](https://github.com/plus-experience/threejs-cameraonpath-helper/blob/master/remove-point_end.gif)

### Remove point at the end of line

1. Select a point you want to remove
2. Click on `removePoint` in helper menu
3. Click on `updateCamPath` in helper menu

![remove-point-select](https://github.com/plus-experience/threejs-cameraonpath-helper/blob/master/remove-point_select.gif)

### Export Spline vector positions

1. Click on `exportPoint` in helper menu
2. Copy position array and paste in `this.curvePosition` in code




