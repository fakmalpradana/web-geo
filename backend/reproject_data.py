import json
import pyproj
from pyproj import Transformer

def reproject_geojson(input_path, output_path, src_crs, dst_crs="EPSG:4326"):
    with open(input_path, 'r') as f:
        data = json.load(f)

    transformer = Transformer.from_crs(src_crs, dst_crs, always_xy=True)

    def transform_coords(coords):
        if isinstance(coords[0], (list, tuple)):
            return [transform_coords(c) for c in coords]
        else:
            return list(transformer.transform(coords[0], coords[1]))

    for feature in data['features']:
        if feature['geometry']:
            feature['geometry']['coordinates'] = transform_coords(feature['geometry']['coordinates'])
    
    # Update CRS to EPSG:4326
    data['crs'] = {
        "type": "name",
        "properties": {
            "name": "urn:ogc:def:crs:OGC:1.3:CRS84"
        }
    }

    with open(output_path, 'w') as f:
        json.dump(data, f)
    
    print(f"Reprojected {input_path} to {output_path}")

if __name__ == "__main__":
    # EPSG:32749 is WGS 84 / UTM zone 49S
    reproject_geojson('backend/data/terban.geojson', 'backend/data/terban_wgs84.geojson', 'EPSG:32749')
