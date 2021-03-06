"use strict"

/****** DATA ******/
module.exports.Data = class Data {
  constructor(options) {
    this._options = options
    this._cells = []
    this._geoJSON = null
    
    // init plugins
    this._overwriteColor = {}
    this._overwriteSize = {}
  }
  updateScales() {
    if (!this._options.data || !this._options.data.data) return
    const t = this
    const computeScale = (scale, min, max, value) => {
      if (value == null) return null
      if (scale.length != 2) return scale
      let values = Object.values(t._options.data.data).map(x => x[value]).filter(x => x !== null)
      if (values.length == 0) values = [0]
      const minComputed = (min) ? min : Math.min(...values)
      const maxComputed = (max) ? max : Math.max(...values)
      return scale(minComputed, maxComputed)
    }
    this._cellColorScale = computeScale(this._options.cellColorScale, this._options.cellColorMin, this._options.cellColorMax, this._options.cellColorKey)
    this._cellSizeScale = computeScale(this._options.cellSizeScale, this._options.cellSizeMin, this._options.cellSizeMax, this._options.cellSizeKey)
  }
  cellColor(id, properties) {
    // return overwritten colour
    if (id in this._overwriteColor) return this._overwriteColor[id]
    // no key
    if (this._options.cellColorKey == null) return this._options.cellColorNoKey
    // compute value
    const value = properties[this._options.cellColorKey]
    // return if empty value
    if (value == null) return this._options.cellColorNoData
    // return if no scale
    if (this._cellColorScale == null) return this._options.cellColorNoKey
    // compute colour
    return this._cellColorScale(value)
  }
  cellSize(id, properties, geometry) {
    let relativeSize
    // choose overwritten relative size
    if (id in this._overwriteSize) relativeSize = this._overwriteSize[id]
    // no key
    else if (this._options.cellSizeKey == null) relativeSize = this._options.cellSizeNoKey
    else {
      // compute value
      const value = properties[this._options.cellSizeKey]
      // empty value
      if (value == null) relativeSize = this._options.cellSizeNoData
      // no scale
      else if (this._cellSizeScale == null) relativeSize = this._options.cellSizeNoKey
      // compute relative size
      else relativeSize = this._cellSizeScale(value)
    }
    // if no resize needed, return geometry
    if (relativeSize == 1) return geometry
    // resize geometry
    const centroid = geometry.reduce(([x0, y0], [x1, y1]) => [x0 + x1, y0 + y1]).map(c => c / geometry.length)
    return geometry.map(([x, y]) => [relativeSize * (x - centroid[0]) + centroid[0], relativeSize * (y - centroid[1]) + centroid[1]])
  }
  produceGeoJSON() {
    const features = []
    const keysToCopy = (this._cells.length > 0) ? Object.keys(this._cells[0]).filter(k => !(k in ['lat', 'lon', 'isPentagon'])) : []
    for (let c of this._cells) {
      if (c.vertices !== undefined) {
        const properties = {}
        for (const k of keysToCopy) properties[k] = c[k]
        features.push({
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [c.vertices],
          },
          properties: properties,
        })
      }
    }
    this._geoJSON = {
      type: 'FeatureCollection',
      features: features,
    }
  }
  reduceGeoJSON(b) {
    // return cached GeoJSON in case of unchanged bounds
    if (b.equals(this._bboxView)) return this._geoJSONreduced
    this._bboxView = b
    // reduce
    this._geoJSONreduced = {
      type: 'FeatureCollection',
      features: [],
    }
    for (let f of this._geoJSON.features) if (b.intersects(L.latLngBounds(f.geometry.coordinates[0].map(c => [c[1], c[0]])))) this._geoJSONreduced.features.push(f)
    // return
    return this._geoJSONreduced
  }
}
