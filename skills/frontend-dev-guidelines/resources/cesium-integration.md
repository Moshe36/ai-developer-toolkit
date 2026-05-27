# Cesium Integration with React

Modern 3D mapping and geospatial visualization using CesiumJS with React and TypeScript.

---

## Why Cesium?

Cesium provides:
- **3D Globe Visualization**: High-performance 3D rendering
- **Geospatial Data**: Support for various data formats (GeoJSON, KML, CZML)
- **Time-dynamic Visualization**: Animate data over time
- **Terrain & Imagery**: High-resolution terrain and satellite imagery
- **Entity System**: Manage markers, polylines, polygons, and models

---

## Basic Cesium Viewer Setup

### Viewer Component

```typescript
import { useEffect, useRef } from 'react';
import * as Cesium from 'cesium';

export const CesiumViewer: React.FC = () => {
  const viewerRef = useRef<Cesium.Viewer | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Initialize Cesium Viewer
    const viewer = new Cesium.Viewer(containerRef.current, {
      terrain: Cesium.Terrain.fromWorldTerrain(),
      imageryProvider: new Cesium.IonImageryProvider({ assetId: 2 }),
      baseLayerPicker: false,
      geocoder: false,
      homeButton: false,
      navigationHelpButton: false,
      timeline: false,
      animation: false,
      fullscreenButton: false,
      vrButton: false,
      sceneModePicker: false,
      infoBox: false,
      selectionIndicator: false,
    });

    viewerRef.current = viewer;

    // Cleanup on unmount
    return () => {
      viewer.destroy();
      viewerRef.current = null;
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="w-full h-full"
      style={{ position: 'relative' }}
    />
  );
};
```

---

## Cesium Context Pattern

### Create Context for Viewer Access

```typescript
// contexts/CesiumContext.tsx
import { createContext, useContext, useRef, useEffect, ReactNode } from 'react';
import * as Cesium from 'cesium';

interface CesiumContextValue {
  viewer: Cesium.Viewer | null;
}

const CesiumContext = createContext<CesiumContextValue>({ viewer: null });

export const useCesiumViewer = () => {
  const context = useContext(CesiumContext);
  if (!context.viewer) {
    throw new Error('useCesiumViewer must be used within CesiumProvider');
  }
  return context.viewer;
};

interface CesiumProviderProps {
  children: ReactNode;
}

export const CesiumProvider: React.FC<CesiumProviderProps> = ({ children }) => {
  const viewerRef = useRef<Cesium.Viewer | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const viewer = new Cesium.Viewer(containerRef.current, {
      // ... viewer options
    });

    viewerRef.current = viewer;

    return () => {
      viewer.destroy();
    };
  }, []);

  return (
    <CesiumContext.Provider value={{ viewer: viewerRef.current }}>
      <div ref={containerRef} className="w-full h-full">
        {viewerRef.current && children}
      </div>
    </CesiumContext.Provider>
  );
};
```

---

## Entity Management

### Adding Markers (Point Entities)

```typescript
import { useEffect } from 'react';
import * as Cesium from 'cesium';
import { useCesiumViewer } from '@/contexts/CesiumContext';

interface Marker {
  id: string;
  position: { lng: number; lat: number; height?: number };
  label: string;
  color?: string;
}

export const useMarkers = (markers: Marker[]) => {
  const viewer = useCesiumViewer();

  useEffect(() => {
    const entities: Cesium.Entity[] = [];

    markers.forEach((marker) => {
      const entity = viewer.entities.add({
        id: marker.id,
        position: Cesium.Cartesian3.fromDegrees(
          marker.position.lng,
          marker.position.lat,
          marker.position.height || 0
        ),
        point: {
          pixelSize: 10,
          color: Cesium.Color.fromCssColorString(marker.color || '#FF0000'),
          outlineColor: Cesium.Color.WHITE,
          outlineWidth: 2,
        },
        label: {
          text: marker.label,
          font: '14px sans-serif',
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
          pixelOffset: new Cesium.Cartesian2(0, -10),
        },
      });

      entities.push(entity);
    });

    // Cleanup: Remove entities on unmount
    return () => {
      entities.forEach((entity) => {
        viewer.entities.remove(entity);
      });
    };
  }, [viewer, markers]);
};

// Usage
export const MapWithMarkers: React.FC = () => {
  const markers = [
    { id: '1', position: { lng: -122.4, lat: 37.8 }, label: 'San Francisco' },
    { id: '2', position: { lng: -118.2, lat: 34.0 }, label: 'Los Angeles' },
  ];

  useMarkers(markers);

  return null; // Rendering handled by Cesium
};
```

### Adding Polylines (Routes)

```typescript
export const usePolylines = (routes: Route[]) => {
  const viewer = useCesiumViewer();

  useEffect(() => {
    const entities: Cesium.Entity[] = [];

    routes.forEach((route) => {
      const positions = route.coordinates.map((coord) =>
        Cesium.Cartesian3.fromDegrees(coord.lng, coord.lat, coord.height || 0)
      );

      const entity = viewer.entities.add({
        id: route.id,
        polyline: {
          positions,
          width: 3,
          material: Cesium.Color.fromCssColorString(route.color || '#0000FF'),
          clampToGround: true,
        },
      });

      entities.push(entity);
    });

    return () => {
      entities.forEach((entity) => viewer.entities.remove(entity));
    };
  }, [viewer, routes]);
};
```

### Adding Polygons (Areas)

```typescript
export const usePolygons = (areas: Area[]) => {
  const viewer = useCesiumViewer();

  useEffect(() => {
    const entities: Cesium.Entity[] = [];

    areas.forEach((area) => {
      const positions = area.coordinates.map((coord) =>
        Cesium.Cartesian3.fromDegrees(coord.lng, coord.lat)
      );

      const entity = viewer.entities.add({
        id: area.id,
        polygon: {
          hierarchy: new Cesium.PolygonHierarchy(positions),
          material: Cesium.Color.fromCssColorString(area.color || '#00FF00').withAlpha(0.5),
          outline: true,
          outlineColor: Cesium.Color.fromCssColorString(area.color || '#00FF00'),
        },
      });

      entities.push(entity);
    });

    return () => {
      entities.forEach((entity) => viewer.entities.remove(entity));
    };
  }, [viewer, areas]);
};
```

---

## Camera Controls

### Fly to Position

```typescript
export const useCameraControls = () => {
  const viewer = useCesiumViewer();

  const flyTo = (lng: number, lat: number, height: number = 10000) => {
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(lng, lat, height),
      duration: 2,
    });
  };

  const flyToEntity = (entityId: string) => {
    const entity = viewer.entities.getById(entityId);
    if (entity) {
      viewer.flyTo(entity, {
        duration: 2,
        offset: new Cesium.HeadingPitchRange(0, -Math.PI / 4, 1000),
      });
    }
  };

  const zoomToExtent = (entities: Cesium.Entity[]) => {
    viewer.flyTo(entities, {
      duration: 2,
    });
  };

  return { flyTo, flyToEntity, zoomToExtent };
};

// Usage
export const CameraController: React.FC = () => {
  const { flyTo, flyToEntity } = useCameraControls();

  return (
    <div className="absolute top-4 right-4 z-10 space-y-2">
      <button onClick={() => flyTo(-122.4, 37.8, 50000)}>
        Fly to San Francisco
      </button>
      <button onClick={() => flyToEntity('marker-1')}>
        Fly to Marker 1
      </button>
    </div>
  );
};
```

---

## Event Handling

### Click Events on Entities

```typescript
export const useEntityClick = (onEntityClick: (entity: Cesium.Entity) => void) => {
  const viewer = useCesiumViewer();

  useEffect(() => {
    const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);

    handler.setInputAction((movement: Cesium.ScreenSpaceEventHandler.PositionedEvent) => {
      const pickedObject = viewer.scene.pick(movement.position);

      if (Cesium.defined(pickedObject) && pickedObject.id instanceof Cesium.Entity) {
        onEntityClick(pickedObject.id);
      }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    return () => {
      handler.destroy();
    };
  }, [viewer, onEntityClick]);
};

// Usage
export const InteractiveMap: React.FC = () => {
  const handleEntityClick = useCallback((entity: Cesium.Entity) => {
    console.log('Clicked entity:', entity.id);
    toast.info(`Clicked on ${entity.id}`);
  }, []);

  useEntityClick(handleEntityClick);

  return null;
};
```

### Mouse Move Events

```typescript
export const useMouseMove = (onMouseMove: (cartesian: Cesium.Cartesian3 | null) => void) => {
  const viewer = useCesiumViewer();

  useEffect(() => {
    const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);

    handler.setInputAction((movement: Cesium.ScreenSpaceEventHandler.MotionEvent) => {
      const ray = viewer.camera.getPickRay(movement.endPosition);
      const cartesian = ray ? viewer.scene.globe.pick(ray, viewer.scene) : null;
      onMouseMove(cartesian);
    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

    return () => {
      handler.destroy();
    };
  }, [viewer, onMouseMove]);
};
```

---

## Data Sources

### Loading GeoJSON

```typescript
export const useGeoJsonData = (url: string) => {
  const viewer = useCesiumViewer();

  useEffect(() => {
    let dataSource: Cesium.GeoJsonDataSource | null = null;

    const loadData = async () => {
      try {
        dataSource = await Cesium.GeoJsonDataSource.load(url, {
          stroke: Cesium.Color.YELLOW,
          fill: Cesium.Color.YELLOW.withAlpha(0.3),
          strokeWidth: 3,
        });

        viewer.dataSources.add(dataSource);
      } catch (error) {
        console.error('Error loading GeoJSON:', error);
        toast.error('Failed to load map data');
      }
    };

    loadData();

    return () => {
      if (dataSource) {
        viewer.dataSources.remove(dataSource);
      }
    };
  }, [viewer, url]);
};
```

### Loading KML

```typescript
export const useKmlData = (url: string) => {
  const viewer = useCesiumViewer();

  useEffect(() => {
    let dataSource: Cesium.KmlDataSource | null = null;

    const loadData = async () => {
      try {
        dataSource = await Cesium.KmlDataSource.load(url, {
          camera: viewer.scene.camera,
          canvas: viewer.scene.canvas,
        });

        viewer.dataSources.add(dataSource);
        viewer.flyTo(dataSource);
      } catch (error) {
        console.error('Error loading KML:', error);
        toast.error('Failed to load KML data');
      }
    };

    loadData();

    return () => {
      if (dataSource) {
        viewer.dataSources.remove(dataSource);
      }
    };
  }, [viewer, url]);
};
```

---

## Performance Optimization

### Entity Clustering

```typescript
export const useClusteredMarkers = (markers: Marker[]) => {
  const viewer = useCesiumViewer();

  useEffect(() => {
    const dataSource = new Cesium.CustomDataSource('markers');

    // Enable clustering
    dataSource.clustering.enabled = true;
    dataSource.clustering.pixelRange = 50;
    dataSource.clustering.minimumClusterSize = 3;

    markers.forEach((marker) => {
      dataSource.entities.add({
        id: marker.id,
        position: Cesium.Cartesian3.fromDegrees(
          marker.position.lng,
          marker.position.lat
        ),
        point: {
          pixelSize: 10,
          color: Cesium.Color.fromCssColorString(marker.color || '#FF0000'),
        },
        label: {
          text: marker.label,
          font: '12px sans-serif',
        },
      });
    });

    viewer.dataSources.add(dataSource);

    return () => {
      viewer.dataSources.remove(dataSource);
    };
  }, [viewer, markers]);
};
```

### Conditional Rendering Based on Camera Distance

```typescript
export const useDistanceBasedVisibility = (
  entityId: string,
  minDistance: number,
  maxDistance: number
) => {
  const viewer = useCesiumViewer();

  useEffect(() => {
    const entity = viewer.entities.getById(entityId);
    if (!entity || !entity.position) return;

    const updateVisibility = () => {
      const position = entity.position.getValue(viewer.clock.currentTime);
      if (!position) return;

      const cameraPosition = viewer.camera.position;
      const distance = Cesium.Cartesian3.distance(cameraPosition, position);

      entity.show = distance >= minDistance && distance <= maxDistance;
    };

    // Update on camera move
    viewer.camera.changed.addEventListener(updateVisibility);
    updateVisibility();

    return () => {
      viewer.camera.changed.removeEventListener(updateVisibility);
    };
  }, [viewer, entityId, minDistance, maxDistance]);
};
```

---

## Best Practices

1. **Always clean up**: Remove entities, event handlers, and data sources in useEffect cleanup
2. **Use CustomDataSource**: Group related entities for better performance
3. **Enable clustering**: For large numbers of markers (100+)
4. **Optimize imagery**: Use appropriate resolution for your zoom level
5. **Lazy load data**: Don't load all entities at once
6. **Cache Cartesian positions**: Computing Cartesian3 is expensive
7. **Use ScreenSpaceEventHandler carefully**: Clean up handlers to prevent memory leaks
8. **Disable unused features**: Turn off timeline, animation if not needed
9. **Use billboards for icons**: More performant than point primitives for custom markers
10. **Test on mobile**: Cesium is GPU-intensive, optimize for mobile performance

---

## Common Patterns

### Entity Selection State

```typescript
export const useEntitySelection = () => {
  const viewer = useCesiumViewer();
  const [selectedEntity, setSelectedEntity] = useState<Cesium.Entity | null>(null);

  useEffect(() => {
    const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);

    handler.setInputAction((movement) => {
      const pickedObject = viewer.scene.pick(movement.position);

      if (Cesium.defined(pickedObject) && pickedObject.id instanceof Cesium.Entity) {
        setSelectedEntity(pickedObject.id);
      } else {
        setSelectedEntity(null);
      }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    return () => {
      handler.destroy();
    };
  }, [viewer]);

  return selectedEntity;
};
```

### Convert Cartesian to Lat/Lng

```typescript
export const cartesianToLatLng = (cartesian: Cesium.Cartesian3) => {
  const cartographic = Cesium.Cartographic.fromCartesian(cartesian);
  return {
    lat: Cesium.Math.toDegrees(cartographic.latitude),
    lng: Cesium.Math.toDegrees(cartographic.longitude),
    height: cartographic.height,
  };
};
```

### Distance Measurement

```typescript
export const calculateDistance = (
  point1: { lng: number; lat: number },
  point2: { lng: number; lat: number }
): number => {
  const pos1 = Cesium.Cartesian3.fromDegrees(point1.lng, point1.lat);
  const pos2 = Cesium.Cartesian3.fromDegrees(point2.lng, point2.lat);

  return Cesium.Cartesian3.distance(pos1, pos2); // meters
};
```

---

## TypeScript Types

```typescript
// Common types for Cesium integration

export interface Position {
  lng: number;
  lat: number;
  height?: number;
}

export interface MarkerData {
  id: string;
  position: Position;
  label: string;
  color?: string;
  icon?: string;
}

export interface RouteData {
  id: string;
  coordinates: Position[];
  color?: string;
  width?: number;
}

export interface AreaData {
  id: string;
  coordinates: Position[];
  color?: string;
  fillOpacity?: number;
}

export interface CameraView {
  position: Position;
  heading?: number;
  pitch?: number;
  roll?: number;
}
```

---

**Remember**: Cesium is GPU-intensive. Always test performance on target devices and optimize entity count, imagery resolution, and rendering settings accordingly!