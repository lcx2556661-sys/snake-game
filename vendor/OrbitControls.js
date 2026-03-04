(function () {
  if (!window.THREE) return;

  function OrbitControls(camera, domElement) {
    this.camera = camera;
    this.domElement = domElement;
    this.enableDamping = true;
    this.enablePan = false;
    this.minDistance = 6;
    this.maxDistance = 40;
    this.maxPolarAngle = Math.PI / 2;
    this.target = new THREE.Vector3(0, 0, 0);

    this._radius = Math.hypot(camera.position.x, camera.position.y, camera.position.z);
    this._theta = Math.atan2(camera.position.x, camera.position.z);
    this._phi = Math.acos(camera.position.y / this._radius);
    this._drag = false;
    this._x = 0;
    this._y = 0;

    var self = this;
    domElement.addEventListener('pointerdown', function (e) {
      self._drag = true;
      self._x = e.clientX;
      self._y = e.clientY;
    });
    window.addEventListener('pointerup', function () { self._drag = false; });
    window.addEventListener('pointermove', function (e) {
      if (!self._drag) return;
      var dx = e.clientX - self._x;
      var dy = e.clientY - self._y;
      self._x = e.clientX;
      self._y = e.clientY;
      self._theta -= dx * 0.005;
      self._phi += dy * 0.005;
      self._phi = Math.max(0.2, Math.min(self.maxPolarAngle, self._phi));
      self.update();
    });
    domElement.addEventListener('wheel', function (e) {
      e.preventDefault();
      self._radius += e.deltaY * 0.01;
      self._radius = Math.max(self.minDistance, Math.min(self.maxDistance, self._radius));
      self.update();
    }, { passive: false });
  }

  OrbitControls.prototype.update = function () {
    var sinPhi = Math.sin(this._phi);
    this.camera.position.set(
      this._radius * sinPhi * Math.sin(this._theta) + this.target.x,
      this._radius * Math.cos(this._phi) + this.target.y,
      this._radius * sinPhi * Math.cos(this._theta) + this.target.z
    );
    this.camera.lookAt(this.target);
  };

  THREE.OrbitControls = OrbitControls;
})();
