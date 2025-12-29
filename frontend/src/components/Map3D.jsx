import React, { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const Map3D = () => {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const [showOSMBuildings, setShowOSMBuildings] = React.useState(true);
  const [showRDTR, setShowRDTR] = React.useState(true);
  const [showZNT, setShowZNT] = React.useState(true);
  const [showPBB, setShowPBB] = React.useState(true);
  const [showBidangTanah, setShowBidangTanah] = React.useState(true);
  const [showTerbanBuildings, setShowTerbanBuildings] = React.useState(true);

  useEffect(() => {
    if (map.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: 'https://tiles.openfreemap.org/styles/liberty', // OpenFreeMap style
      center: [106.8117, -6.2165], // Semanggi, Jakarta Pusat
      center: [110.37389, -7.7788], // Terban, Yogyakarta
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
        data: `${import.meta.env.VITE_API_URL}/collections/obs/items?f=json`
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

      // 3. Add RDTR Layer (Base - Zoning with low extrusion)
      map.current.addSource('rdtr-features', {
        type: 'geojson',
        data: `${import.meta.env.VITE_API_URL}/collections/rdtr/items?f=json&limit=50000`,

        generateId: true
      });

      map.current.addLayer({
        id: 'rdtr-layer',
        type: 'fill-extrusion',
        source: 'rdtr-features',
        paint: {
          'fill-extrusion-color': [
            'match',
            ['get', 'KODZON_1'], // Zone code: K=Komersial, R=Perumahan, etc.
            'K', '#FFB6C1', // Komersial - Pink
            'R', '#FFE5B4', // Perumahan - Beige
            'I', '#B0C4DE', // Industri - Blue
            'RTH', '#90EE90', // Ruang Terbuka Hijau - Green
            'SPU', '#DDA0DD', // Sarana Pelayanan Umum - Plum
            '#CCCCCC' // Default gray
          ],
          'fill-extrusion-height': 1, // Low extrusion for base layer
          'fill-extrusion-base': 0,
          'fill-extrusion-opacity': 0.4
        },
        layout: {
          'visibility': 'visible'
        }
      });

      // 4. Add ZNT Layer (Middle - Land Value with minimal extrusion)
      map.current.addSource('znt-features', {
        type: 'geojson',
        data: `${import.meta.env.VITE_API_URL}/collections/znt/items?f=json&limit=50000`,

        generateId: true
      });

      map.current.addLayer({
        id: 'znt-layer',
        type: 'fill-extrusion',
        source: 'znt-features',
        paint: {
          'fill-extrusion-color': [
            'case',
            ['>', ['get', 'MEAN'], 0],
            [
              'interpolate',
              ['linear'],
              ['get', 'MEAN'],
              0, '#ffffcc',
              1000000, '#ffeda0',
              5000000, '#fed976',
              10000000, '#feb24c',
              20000000, '#fd8d3c',
              50000000, '#fc4e2a',
              100000000, '#e31a1c',
              200000000, '#bd0026'
            ],
            '#E8E8E8' // Light gray for no data
          ],
          'fill-extrusion-height': 0.3, // Minimal extrusion
          'fill-extrusion-base': 0,
          'fill-extrusion-opacity': 0.35
        },
        layout: {
          'visibility': 'visible'
        }
      });

      // 5. Add PBB Layer (Outline with dashed pattern)
      map.current.addSource('pbb-features', {
        type: 'geojson',
        data: `${import.meta.env.VITE_API_URL}/collections/pbb/items?f=json&limit=50000`,

        generateId: true
      });

      map.current.addLayer({
        id: 'pbb-layer',
        type: 'line',
        source: 'pbb-features',
        paint: {
          'line-color': '#FF6347',
          'line-width': 1.5,
          'line-dasharray': [3, 2],
          'line-opacity': 0.7
        },
        layout: {
          'visibility': 'visible'
        }
      });

      // 6. Add Bidang Tanah Layer (Top - Thick boundary lines)
      map.current.addSource('bidang-tanah-features', {
        type: 'geojson',
        data: `${import.meta.env.VITE_API_URL}/collections/bidang_tanah/items?f=json&limit=50000`,

        generateId: true
      });

      map.current.addLayer({
        id: 'bidang-tanah-layer',
        type: 'line',
        source: 'bidang-tanah-features',
        paint: {
          'line-color': '#2C3E50',
          'line-width': 2.5,
          'line-opacity': 0.9
        },
        layout: {
          'visibility': 'visible'
        }
      });

      // 7. Add Terban Buildings (3D)
      map.current.addSource('terban-features', {
        type: 'geojson',
        data: `${import.meta.env.VITE_API_URL}/static/terban_wgs84.geojson`,

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
        },
        layout: {
          'visibility': 'visible'
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

      // Click interactions for RDTR layer
      map.current.on('click', 'rdtr-layer', (e) => {
        if (e.features.length > 0) {
          const feature = e.features[0];
          const properties = feature.properties;

          let popupContent = '<div style="max-height: 300px; overflow-y: auto; font-family: sans-serif; min-width: 250px;">';
          popupContent += '<h3 style="margin-top: 0; border-bottom: 2px solid #FFB6C1; padding-bottom: 5px; color: #333;">RDTR - Zoning Data</h3>';
          popupContent += '<table style="width: 100%; border-collapse: collapse; font-size: 12px;">';

          // Highlight important properties
          const importantProps = ['NAMSZN_1', 'KODZON_1', 'KODUNK', 'WADMKD', 'WADMKC', 'KDB', 'KLB', 'KDH', 'KTB'];
          importantProps.forEach(key => {
            if (properties[key] !== undefined && properties[key] !== null) {
              popupContent += `<tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 4px; font-weight: bold; color: #555;">${key}</td>
                <td style="padding: 4px;">${properties[key]}</td>
              </tr>`;
            }
          });

          popupContent += '</table>';
          popupContent += '<details style="margin-top: 8px;"><summary style="cursor: pointer; color: #666;">Show all properties</summary>';
          popupContent += '<table style="width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 5px;">';
          for (const key in properties) {
            if (!importantProps.includes(key)) {
              popupContent += `<tr style="border-bottom: 1px solid #f5f5f5;">
                <td style="padding: 3px; font-weight: bold; color: #777; font-size: 10px;">${key}</td>
                <td style="padding: 3px; font-size: 10px;">${properties[key]}</td>
              </tr>`;
            }
          }
          popupContent += '</table></details></div>';

          new maplibregl.Popup({ offset: 25, maxWidth: '400px' })
            .setLngLat(e.lngLat)
            .setHTML(popupContent)
            .addTo(map.current);
        }
      });

      // Click interactions for ZNT layer
      map.current.on('click', 'znt-layer', (e) => {
        if (e.features.length > 0) {
          const feature = e.features[0];
          const properties = feature.properties;

          let popupContent = '<div style="max-height: 300px; overflow-y: auto; font-family: sans-serif; min-width: 250px;">';
          popupContent += '<h3 style="margin-top: 0; border-bottom: 2px solid #fd8d3c; padding-bottom: 5px; color: #333;">ZNT - Land Value Zone</h3>';
          popupContent += '<table style="width: 100%; border-collapse: collapse; font-size: 12px;">';

          const importantProps = ['MEAN', 'MIN_', 'MAX_', 'NOZONE', 'WADMKD', 'WADMKC', 'WADMKK'];
          importantProps.forEach(key => {
            if (properties[key] !== undefined && properties[key] !== null) {
              let value = properties[key];
              if (key === 'MEAN' || key === 'MIN_' || key === 'MAX_') {
                value = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(value);
              }
              popupContent += `<tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 4px; font-weight: bold; color: #555;">${key}</td>
                <td style="padding: 4px;">${value}</td>
              </tr>`;
            }
          });

          popupContent += '</table>';
          popupContent += '<details style="margin-top: 8px;"><summary style="cursor: pointer; color: #666;">Show all properties</summary>';
          popupContent += '<table style="width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 5px;">';
          for (const key in properties) {
            if (!importantProps.includes(key)) {
              popupContent += `<tr style="border-bottom: 1px solid #f5f5f5;">
                <td style="padding: 3px; font-weight: bold; color: #777; font-size: 10px;">${key}</td>
                <td style="padding: 3px; font-size: 10px;">${properties[key]}</td>
              </tr>`;
            }
          }
          popupContent += '</table></details></div>';

          new maplibregl.Popup({ offset: 25, maxWidth: '400px' })
            .setLngLat(e.lngLat)
            .setHTML(popupContent)
            .addTo(map.current);
        }
      });

      // Click interactions for PBB layer
      map.current.on('click', 'pbb-layer', (e) => {
        if (e.features.length > 0) {
          const feature = e.features[0];
          const properties = feature.properties;

          let popupContent = '<div style="max-height: 300px; overflow-y: auto; font-family: sans-serif; min-width: 250px;">';
          popupContent += '<h3 style="margin-top: 0; border-bottom: 2px solid #FF6347; padding-bottom: 5px; color: #333;">PBB - Tax Data</h3>';
          popupContent += '<table style="width: 100%; border-collapse: collapse; font-size: 12px;">';

          for (const key in properties) {
            if (properties[key] !== undefined && properties[key] !== null && properties[key] !== '') {
              popupContent += `<tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 4px; font-weight: bold; color: #555;">${key}</td>
                <td style="padding: 4px;">${properties[key]}</td>
              </tr>`;
            }
          }
          popupContent += '</table></div>';

          new maplibregl.Popup({ offset: 25, maxWidth: '400px' })
            .setLngLat(e.lngLat)
            .setHTML(popupContent)
            .addTo(map.current);
        }
      });

      // Click interactions for Bidang Tanah layer
      map.current.on('click', 'bidang-tanah-layer', (e) => {
        if (e.features.length > 0) {
          const feature = e.features[0];
          const properties = feature.properties;

          let popupContent = '<div style="max-height: 300px; overflow-y: auto; font-family: sans-serif; min-width: 250px;">';
          popupContent += '<h3 style="margin-top: 0; border-bottom: 2px solid #2C3E50; padding-bottom: 5px; color: #333;">Bidang Tanah - Land Parcel</h3>';
          popupContent += '<table style="width: 100%; border-collapse: collapse; font-size: 12px;">';

          const importantProps = ['NIB', 'HAK', 'SURAT_UKUR', 'KELURAHAN', 'PEMILIK', 'LUAS_GEO', 'PENGGUNAAN'];
          importantProps.forEach(key => {
            if (properties[key] !== undefined && properties[key] !== null && properties[key] !== '') {
              let value = properties[key];
              if (key === 'LUAS_GEO') {
                value = `${parseFloat(value).toFixed(2)} m²`;
              }
              popupContent += `<tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 4px; font-weight: bold; color: #555;">${key}</td>
                <td style="padding: 4px;">${value}</td>
              </tr>`;
            }
          });

          popupContent += '</table>';
          popupContent += '<details style="margin-top: 8px;"><summary style="cursor: pointer; color: #666;">Show all properties</summary>';
          popupContent += '<table style="width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 5px;">';
          for (const key in properties) {
            if (!importantProps.includes(key) && properties[key] !== null && properties[key] !== '') {
              popupContent += `<tr style="border-bottom: 1px solid #f5f5f5;">
                <td style="padding: 3px; font-weight: bold; color: #777; font-size: 10px;">${key}</td>
                <td style="padding: 3px; font-size: 10px;">${properties[key]}</td>
              </tr>`;
            }
          }
          popupContent += '</table></details></div>';

          new maplibregl.Popup({ offset: 25, maxWidth: '400px' })
            .setLngLat(e.lngLat)
            .setHTML(popupContent)
            .addTo(map.current);
        }
      });

      // Change cursor on hover for all clickable layers
      ['rdtr-layer', 'znt-layer', 'pbb-layer', 'bidang-tanah-layer'].forEach(layerId => {
        map.current.on('mouseenter', layerId, () => {
          map.current.getCanvas().style.cursor = 'pointer';
        });
        map.current.on('mouseleave', layerId, () => {
          map.current.getCanvas().style.cursor = '';
        });
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
          loader.load(`${import.meta.env.VITE_API_URL}/static/model.glb`, (gltf) => {

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

  // Effect to toggle RDTR layer
  useEffect(() => {
    if (!map.current || !map.current.loaded()) return;
    if (map.current.getLayer('rdtr-layer')) {
      map.current.setLayoutProperty('rdtr-layer', 'visibility', showRDTR ? 'visible' : 'none');
    }
  }, [showRDTR]);

  // Effect to toggle ZNT layer
  useEffect(() => {
    if (!map.current || !map.current.loaded()) return;
    if (map.current.getLayer('znt-layer')) {
      map.current.setLayoutProperty('znt-layer', 'visibility', showZNT ? 'visible' : 'none');
    }
  }, [showZNT]);

  // Effect to toggle PBB layer
  useEffect(() => {
    if (!map.current || !map.current.loaded()) return;
    if (map.current.getLayer('pbb-layer')) {
      map.current.setLayoutProperty('pbb-layer', 'visibility', showPBB ? 'visible' : 'none');
    }
  }, [showPBB]);

  // Effect to toggle Bidang Tanah layer
  useEffect(() => {
    if (!map.current || !map.current.loaded()) return;
    if (map.current.getLayer('bidang-tanah-layer')) {
      map.current.setLayoutProperty('bidang-tanah-layer', 'visibility', showBidangTanah ? 'visible' : 'none');
    }
  }, [showBidangTanah]);

  // Effect to toggle Terban Buildings layer
  useEffect(() => {
    if (!map.current || !map.current.loaded()) return;
    if (map.current.getLayer('terban-buildings')) {
      map.current.setLayoutProperty('terban-buildings', 'visibility', showTerbanBuildings ? 'visible' : 'none');
    }
  }, [showTerbanBuildings]);

  return (
    <div className="map-wrap">
      <div ref={mapContainer} className="map" />
      <div className="controls" style={{
        position: 'absolute',
        top: '10px',
        left: '10px',
        zIndex: 1,
        background: 'white',
        padding: '12px',
        borderRadius: '6px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.15)',
        maxHeight: '80vh',
        overflowY: 'auto',
        minWidth: '200px'
      }}>
        <h3 style={{ margin: '0 0 10px 0', fontSize: '14px', fontWeight: 'bold', borderBottom: '2px solid #333', paddingBottom: '5px' }}>
          Layer Controls
        </h3>

        <div style={{ marginBottom: '8px' }}>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', fontSize: '13px' }}>
            <input
              type="checkbox"
              checked={showOSMBuildings}
              onChange={(e) => setShowOSMBuildings(e.target.checked)}
              style={{ marginRight: '8px' }}
            />
            OSM Buildings
          </label>
        </div>

        <hr style={{ margin: '10px 0', border: 'none', borderTop: '1px solid #ddd' }} />

        <div style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', fontSize: '13px' }}>
            <input
              type="checkbox"
              checked={showRDTR}
              onChange={(e) => setShowRDTR(e.target.checked)}
              style={{ marginRight: '8px' }}
            />
            <span>
              <strong>RDTR</strong> (Zoning)
            </span>
          </label>
          <button
            onClick={() => map.current.flyTo({ center: [106.8117, -6.2165], zoom: 16, pitch: 60, essential: true })}
            title="Fly to Jakarta"
            style={{
              background: 'none',
              border: '1px solid #ccc',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '10px',
              padding: '2px 5px',
              color: '#555'
            }}
          >
            Fly To
          </button>
        </div>

        <div style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', fontSize: '13px' }}>
            <input
              type="checkbox"
              checked={showZNT}
              onChange={(e) => setShowZNT(e.target.checked)}
              style={{ marginRight: '8px' }}
            />
            <span>
              <strong>ZNT</strong> (Land Value)
            </span>
          </label>
          <button
            onClick={() => map.current.flyTo({ center: [106.8117, -6.2165], zoom: 16, pitch: 60, essential: true })}
            title="Fly to Jakarta"
            style={{
              background: 'none',
              border: '1px solid #ccc',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '10px',
              padding: '2px 5px',
              color: '#555'
            }}
          >
            Fly To
          </button>
        </div>

        <div style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', fontSize: '13px' }}>
            <input
              type="checkbox"
              checked={showPBB}
              onChange={(e) => setShowPBB(e.target.checked)}
              style={{ marginRight: '8px' }}
            />
            <span>
              <strong>PBB</strong> (Tax Data)
            </span>
          </label>
          <button
            onClick={() => map.current.flyTo({ center: [106.8117, -6.2165], zoom: 16, pitch: 60, essential: true })}
            title="Fly to Jakarta"
            style={{
              background: 'none',
              border: '1px solid #ccc',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '10px',
              padding: '2px 5px',
              color: '#555'
            }}
          >
            Fly To
          </button>
        </div>

        <div style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', fontSize: '13px' }}>
            <input
              type="checkbox"
              checked={showBidangTanah}
              onChange={(e) => setShowBidangTanah(e.target.checked)}
              style={{ marginRight: '8px' }}
            />
            <span>
              <strong>Bidang Tanah</strong> (Parcels)
            </span>
          </label>
          <button
            onClick={() => map.current.flyTo({ center: [106.8117, -6.2165], zoom: 16, pitch: 60, essential: true })}
            title="Fly to Jakarta"
            style={{
              background: 'none',
              border: '1px solid #ccc',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '10px',
              padding: '2px 5px',
              color: '#555'
            }}
          >
            Fly To
          </button>
        </div>

        <div style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', fontSize: '13px' }}>
            <input
              type="checkbox"
              checked={showTerbanBuildings}
              onChange={(e) => setShowTerbanBuildings(e.target.checked)}
              style={{ marginRight: '8px' }}
            />
            <span>
              <strong>Terban Buildings</strong> (3D)
            </span>
          </label>
          <button
            onClick={() => map.current.flyTo({ center: [110.37389, -7.7788], zoom: 16, pitch: 60, essential: true })}
            title="Fly to Yogyakarta"
            style={{
              background: 'none',
              border: '1px solid #ccc',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '10px',
              padding: '2px 5px',
              color: '#555'
            }}
          >
            Fly To
          </button>
        </div>

        <hr style={{ margin: '10px 0', border: 'none', borderTop: '1px solid #ddd' }} />

        <div style={{ textAlign: 'center' }}>
          <a
            href={`${import.meta.env.VITE_API_URL}/openapi?f=html`}
            target="_blank"

            rel="noopener noreferrer"
            style={{
              display: 'inline-block',
              background: '#007bff',
              color: 'white',
              textDecoration: 'none',
              padding: '6px 12px',
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: 'bold'
            }}
          >
            Backend Docs
          </a>
        </div>
      </div>
    </div>
  );
};

export default Map3D;
