import React, { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const Map3D = () => {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const [showOSMBuildings, setShowOSMBuildings] = React.useState(true);

  useEffect(() => {
    if (map.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: 'https://tiles.openfreemap.org/styles/liberty', // OpenFreeMap style
      center: [110.3738, -7.7828], // Yogyakarta, Terban area
      zoom: 16,
      pitch: 60,
      bearing: -20,
      antialias: true // Important for Three.js
    });

    map.current.on('load', () => {
      // 1. Add Terrain
      map.current.addSource('terrain', {
        type: 'raster-dem',
        url: 'https://demotiles.maplibre.org/terrain-tiles/tiles.json',
        tileSize: 256
      });
      map.current.setTerrain({ source: 'terrain', exaggeration: 1.5 });

      // 2. Add OGC API Features Layer (GeoJSON)
      map.current.addSource('ogc-features', {
        type: 'geojson',
        data: 'http://localhost:5002/collections/obs/items?f=json'
      });

      map.current.addLayer({
        id: 'ogc-points',
        type: 'circle',
        source: 'ogc-features',
        paint: {
          'circle-radius': 8,
          'circle-color': '#ff0000',
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff'
        }
      });

      // 3. Add Terban Buildings (3D)
      map.current.addSource('terban-features', {
        type: 'geojson',
        data: 'http://localhost:5001/terban_wgs84.geojson',
        generateId: true // Ensure features have IDs for state
      });

      map.current.addLayer({
        id: 'terban-buildings',
        type: 'fill-extrusion',
        source: 'terban-features',
        paint: {
          'fill-extrusion-color': [
            'case',
            ['boolean', ['feature-state', 'hover'], false],
            '#ff0000', // Highlight color (red)
            '#aaa' // Default color
          ],
          'fill-extrusion-height': ['get', 'H_max'],
          'fill-extrusion-base': 0,
          'fill-extrusion-opacity': 0.8
        }
      });

      // Hover and Click Interactions
      let hoveredStateId = null;

      map.current.on('mousemove', 'terban-buildings', (e) => {
        if (e.features.length > 0) {
          if (hoveredStateId !== null) {
            map.current.setFeatureState(
              { source: 'terban-features', id: hoveredStateId },
              { hover: false }
            );
          }
          hoveredStateId = e.features[0].id;
          map.current.setFeatureState(
            { source: 'terban-features', id: hoveredStateId },
            { hover: true }
          );
          map.current.getCanvas().style.cursor = 'pointer';
        }
      });

      map.current.on('mouseleave', 'terban-buildings', () => {
        if (hoveredStateId !== null) {
          map.current.setFeatureState(
            { source: 'terban-features', id: hoveredStateId },
            { hover: false }
          );
        }
        hoveredStateId = null;
        map.current.getCanvas().style.cursor = '';
      });

      map.current.on('click', 'terban-buildings', (e) => {
        if (e.features.length > 0) {
          const feature = e.features[0];

          // Fly to feature
          // Calculate centroid or just use the click coordinate for simplicity, 
          // or better, use the feature geometry to find center.
          // Since it's a polygon, we can use the click lngLat or calculate center.
          // Using click lngLat is smoother for user interaction.
          map.current.flyTo({
            center: e.lngLat,
            zoom: 19,
            pitch: 60,
            essential: true
          });

          // Create Popup content
          const properties = feature.properties;
          let popupContent = '<div style="max-height: 200px; overflow-y: auto; font-family: sans-serif;">';
          popupContent += '<h3 style="margin-top: 0; border-bottom: 1px solid #ccc; padding-bottom: 5px;">Building Data</h3>';
          popupContent += '<table style="width: 100%; border-collapse: collapse;">';

          for (const key in properties) {
            popupContent += `<tr style="border-bottom: 1px solid #eee;">
              <td style="padding: 4px; font-weight: bold; color: #555;">${key}</td>
              <td style="padding: 4px;">${properties[key]}</td>
            </tr>`;
          }
          popupContent += '</table></div>';

          new maplibregl.Popup({ offset: 25 })
            .setLngLat(e.lngLat)
            .setHTML(popupContent)
            .addTo(map.current);
        }
      });

      // 4. Add 3D Model Layer (GLB) using Three.js Custom Layer
      const modelOrigin = [107.61, -6.915];
      const modelAltitude = 0;
      const modelRotate = [Math.PI / 2, 0, 0];

      const modelAsMercatorCoordinate = maplibregl.MercatorCoordinate.fromLngLat(
        modelOrigin,
        modelAltitude
      );

      const modelTransform = {
        translateX: modelAsMercatorCoordinate.x,
        translateY: modelAsMercatorCoordinate.y,
        translateZ: modelAsMercatorCoordinate.z,
        rotateX: modelRotate[0],
        rotateY: modelRotate[1],
        rotateZ: modelRotate[2],
        scale: modelAsMercatorCoordinate.meterInMercatorCoordinateUnits()
      };

      const customLayer = {
        id: '3d-model',
        type: 'custom',
        renderingMode: '3d',
        onAdd: function (map, gl) {
          this.camera = new THREE.Camera();
          this.scene = new THREE.Scene();

          // Create two lights to illuminate the model
          const directionalLight = new THREE.DirectionalLight(0xffffff);
          directionalLight.position.set(0, -70, 100).normalize();
          this.scene.add(directionalLight);

          const directionalLight2 = new THREE.DirectionalLight(0xffffff);
          directionalLight2.position.set(0, 70, 100).normalize();
          this.scene.add(directionalLight2);

          const loader = new GLTFLoader();
          loader.load('http://localhost:5001/model.glb', (gltf) => {
            this.scene.add(gltf.scene);
          }, undefined, (error) => {
            console.error('An error happened loading the GLB model:', error);
          });

          this.map = map;
          this.renderer = new THREE.WebGLRenderer({
            canvas: map.getCanvas(),
            context: gl,
            antialias: true
          });

          this.renderer.autoClear = false;
        },
        render: function (gl, matrix) {
          const rotationX = new THREE.Matrix4().makeRotationAxis(
            new THREE.Vector3(1, 0, 0),
            modelTransform.rotateX
          );
          const rotationY = new THREE.Matrix4().makeRotationAxis(
            new THREE.Vector3(0, 1, 0),
            modelTransform.rotateY
          );
          const rotationZ = new THREE.Matrix4().makeRotationAxis(
            new THREE.Vector3(0, 0, 1),
            modelTransform.rotateZ
          );

          const m = new THREE.Matrix4().fromArray(matrix);
          const l = new THREE.Matrix4()
            .makeTranslation(
              modelTransform.translateX,
              modelTransform.translateY,
              modelTransform.translateZ
            )
            .scale(
              new THREE.Vector3(
                modelTransform.scale,
                -modelTransform.scale,
                modelTransform.scale
              )
            )
            .multiply(rotationX)
            .multiply(rotationY)
            .multiply(rotationZ);

          this.camera.projectionMatrix = m.multiply(l);
          this.renderer.resetState();
          this.renderer.render(this.scene, this.camera);
          this.map.triggerRepaint();
        }
      };

      map.current.addLayer(customLayer);
    });

  }, []);

  // Effect to toggle OSM buildings
  useEffect(() => {
    if (!map.current) return;

    const toggleBuildings = () => {
      const style = map.current.getStyle();
      if (!style || !style.layers) return;

      style.layers.forEach(layer => {
        if (layer.id.includes('building') && layer.id !== 'terban-buildings') {
          map.current.setLayoutProperty(
            layer.id,
            'visibility',
            showOSMBuildings ? 'visible' : 'none'
          );
        }
      });
    };

    // Check if map is loaded, if not wait for load event
    if (map.current.loaded()) {
      toggleBuildings();
    } else {
      map.current.on('load', toggleBuildings);
    }

    return () => {
      if (map.current) {
        map.current.off('load', toggleBuildings);
      }
    };

  }, [showOSMBuildings]);

  return (
    <div className="map-wrap">
      <div ref={mapContainer} className="map" />
      <div className="controls" style={{
        position: 'absolute',
        top: '10px',
        left: '10px',
        zIndex: 1,
        background: 'white',
        padding: '10px',
        borderRadius: '4px',
        boxShadow: '0 0 10px rgba(0,0,0,0.1)'
      }}>
        <label>
          <input
            type="checkbox"
            checked={showOSMBuildings}
            onChange={(e) => setShowOSMBuildings(e.target.checked)}
          />
          Show OSM Buildings
        </label>
      </div>
    </div>
  );
};

export default Map3D;
