import React from'react';
function element(tag:string){return function SVGElement({children,accessible,...props}:any){return React.createElement(tag,props,children)}}
export const Svg=element('svg'),Circle=element('circle'),Polyline=element('polyline'),Path=element('path'),G=element('g'),Rect=element('rect'),Line=element('line'),Polygon=element('polygon'),Defs=element('defs'),LinearGradient=element('linearGradient'),Stop=element('stop');export default Svg;
export const RadialGradient=element('radialGradient');
