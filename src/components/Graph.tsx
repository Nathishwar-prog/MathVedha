import React, {useRef, useLayoutEffect} from 'react';
import * as d3 from 'd3';
import {Point, Line, Intersection} from '../types';
import {Plus, Minus, RotateCcw, ChevronUp, ChevronDown, ChevronLeft, ChevronRight} from 'lucide-react';

interface GraphProps {
  points: Point[];
  lines: Line[];
  intersections: Intersection[];
  onAddPoint?: (x: number, y: number) => void;
  onPointHover?: (point: Point | null) => void;
  onLineHover?: (line: Line | null) => void;
  onLineClick?: (line: Line) => void;
}

export default function Graph({
  points, 
  lines, 
  intersections, 
  onAddPoint, 
  onPointHover,
  onLineHover,
  onLineClick
}: GraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);

  useLayoutEffect(() => {
    if (!containerRef.current || !svgRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height);

    svg.selectAll('*').remove();

    // Scales
    const initialRange = 10;
    const xScale = d3.scaleLinear()
      .domain([-initialRange, initialRange])
      .range([0, width]);

    const yScale = d3.scaleLinear()
      .domain([-initialRange, initialRange])
      .range([height, 0]);

    // Container for everything that should be zoomed/panned
    const g = svg.append('g');

    // Zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 50])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
        updateAxes(event.transform);
      });

    zoomRef.current = zoom;
    svg.call(zoom);

    // Axes
    const xAxisG = svg.append('g').attr('class', 'x-axis');
    const yAxisG = svg.append('g').attr('class', 'y-axis');

    function updateAxes(transform = d3.zoomIdentity) {
      const newXScale = transform.rescaleX(xScale);
      const newYScale = transform.rescaleY(yScale);

      const xAxis = d3.axisBottom(newXScale).ticks(10).tickSize(-height).tickPadding(10);
      const yAxis = d3.axisLeft(newYScale).ticks(10).tickSize(-width).tickPadding(10);

      xAxisG.attr('transform', `translate(0, ${newYScale(0)})`)
        .call(xAxis)
        .call(g => g.select('.domain').attr('stroke-width', 2).attr('stroke', '#334155'))
        .call(g => g.selectAll('.tick line').attr('stroke', '#e2e8f0'));

      yAxisG.attr('transform', `translate(${newXScale(0)}, 0)`)
        .call(yAxis)
        .call(g => g.select('.domain').attr('stroke-width', 2).attr('stroke', '#334155'))
        .call(g => g.selectAll('.tick line').attr('stroke', '#e2e8f0'));
    }

    updateAxes();

    // Draw Lines
    const linesG = g.selectAll<SVGGElement, Line>('.lines-group').data([null]).join('g').attr('class', 'lines-group');
    
    const validLines = lines.filter(l => l.m !== undefined && l.b !== undefined);
    
    const lineElements = linesG.selectAll<SVGLineElement, Line>('line.graph-line')
      .data(validLines, d => d.id);

    lineElements.join(
      enter => enter.append('line')
        .attr('class', 'graph-line cursor-pointer')
        .attr('opacity', 0)
        .call(enter => enter.transition().duration(600).attr('opacity', 1)),
      update => update,
      exit => exit.transition().duration(300).attr('opacity', 0).remove()
    )
    .attr('data-id', d => d.id)
    .attr('stroke', d => d.color)
    .attr('stroke-width', d => d.thickness || 3)
    .attr('stroke-dasharray', d => d.dashStyle === 'dashed' ? '8,6' : d.dashStyle === 'dotted' ? '2,4' : 'none')
    .each(function(d) {
      let x1, y1, x2, y2;
      if (d.m === Infinity) {
        x1 = x2 = d.b!;
        y1 = -100;
        y2 = 100;
      } else {
        x1 = -100;
        y1 = d.m! * x1 + d.b!;
        x2 = 100;
        y2 = d.m! * x2 + d.b!;
      }
      d3.select(this)
        .transition().duration(300)
        .attr('x1', xScale(x1))
        .attr('y1', yScale(y1))
        .attr('x2', xScale(x2))
        .attr('y2', yScale(y2));
    })
    .on('mouseenter', function(event, d) {
      d3.select(this).attr('stroke-width', (d.thickness || 3) + 2);
      onLineHover?.(d);
    })
    .on('mouseleave', function(event, d) {
      d3.select(this).attr('stroke-width', d.thickness || 3);
      onLineHover?.(null);
    })
    .on('click', (event, d) => {
      event.stopPropagation();
      onLineClick?.(d);
    });

    // Intersections
    const intersectionsG = g.selectAll<SVGGElement, Intersection[]>('.intersections-group').data([intersections]).join('g').attr('class', 'intersections-group');
    
    const interCircles = intersectionsG.selectAll<SVGCircleElement, Intersection>('circle')
      .data(intersections, d => `${d.line1Id}-${d.line2Id}`);

    interCircles.join(
      enter => enter.append('circle')
        .attr('r', 0)
        .attr('fill', '#ef4444')
        .attr('stroke', 'white')
        .attr('stroke-width', 2)
        .call(enter => enter.transition().duration(500).attr('r', 5)),
      update => update.transition().duration(300)
        .attr('cx', d => xScale(d.x))
        .attr('cy', d => yScale(d.y)),
      exit => exit.transition().duration(300).attr('r', 0).remove()
    )
    .attr('cx', d => xScale(d.x))
    .attr('cy', d => yScale(d.y));

    // Points
    const pointsG = g.selectAll<SVGGElement, Point[]>('.points-group').data([points]).join('g').attr('class', 'points-group');
    
    const pointNodes = pointsG.selectAll<SVGGElement, Point>('g.point-node')
      .data(points, d => d.id);

    const pointEnter = pointNodes.join(
      enter => {
        const gNode = enter.append('g').attr('class', 'point-node');
        gNode.append('circle')
          .attr('r', 0)
          .attr('stroke', 'white')
          .attr('stroke-width', 2)
          .attr('cursor', 'pointer')
          .call(c => c.transition().duration(400).attr('r', 6));
        
        gNode.append('text')
          .attr('font-size', '12px')
          .attr('class', 'font-sans font-medium select-none')
          .attr('fill', '#475569')
          .attr('opacity', 0)
          .call(t => t.transition().delay(200).duration(300).attr('opacity', 1));
          
        return gNode;
      },
      update => update,
      exit => exit.transition().duration(300).attr('opacity', 0).remove()
    );

    pointEnter.select('circle')
      .attr('cx', d => xScale(d.x))
      .attr('cy', d => yScale(d.y))
      .attr('fill', d => d.color)
      .on('mouseenter', (event, d) => onPointHover?.(d))
      .on('mouseleave', () => onPointHover?.(null));

    pointEnter.select('text')
      .attr('x', d => xScale(d.x) + 8)
      .attr('y', d => yScale(d.y) - 8)
      .text(d => d.label || '');

    // Click handler for adding points
    svg.on('click', (event) => {
      if (event.defaultPrevented) return;
      const [mx, my] = d3.pointer(event);
      const transform = d3.zoomTransform(svgRef.current!);
      const newXScale = transform.rescaleX(xScale);
      const newYScale = transform.rescaleY(yScale);
      
      const x = newXScale.invert(mx);
      const y = newYScale.invert(my);

      // Snap to grid (0.5 increments)
      const snappedX = Math.round(x * 2) / 2;
      const snappedY = Math.round(y * 2) / 2;

      onAddPoint?.(snappedX, snappedY);
    });

  }, [points, lines, intersections]);

  const handleZoom = (direction: 'in' | 'out' | 'reset') => {
    if (!svgRef.current || !zoomRef.current) return;
    const svg = d3.select(svgRef.current);
    if (direction === 'reset') {
      svg.transition().duration(500).call(zoomRef.current.transform, d3.zoomIdentity);
    } else {
      const factor = direction === 'in' ? 1.5 : 1 / 1.5;
      svg.transition().duration(300).call(zoomRef.current.scaleBy, factor);
    }
  };

  const handlePan = (dx: number, dy: number) => {
    if (!svgRef.current || !zoomRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.transition().duration(200).call(zoomRef.current.translateBy, dx, dy);
  };

  return (
    <div ref={containerRef} className="w-full h-full relative overflow-hidden bg-white rounded-xl shadow-inner border border-slate-200 group">
      <svg ref={svgRef} className="w-full h-full cursor-crosshair">
        <style>
          {`
            .tick text { font-family: ui-sans-serif, system-ui; fill: #64748b; font-size: 10px; }
            .tick line { stroke-opacity: 0.2; }
            .graph-line { filter: drop-shadow(0px 2px 4px rgba(0,0,0,0.1)); }
          `}
        </style>
      </svg>

      {/* Control Panel Overlay */}
      <div className="absolute top-4 right-4 flex flex-col gap-3 pointer-events-none">
        {/* Zoom Controls */}
        <div className="flex flex-col bg-white/90 backdrop-blur-sm rounded-lg border border-slate-200 shadow-sm overflow-hidden pointer-events-auto">
          <ControlButton onClick={() => handleZoom('in')} icon={<Plus className="w-4 h-4" />} title="Zoom In" />
          <div className="h-px bg-slate-100" />
          <ControlButton onClick={() => handleZoom('out')} icon={<Minus className="w-4 h-4" />} title="Zoom Out" />
          <div className="h-px bg-slate-100" />
          <ControlButton onClick={() => handleZoom('reset')} icon={<RotateCcw className="w-4 h-4" />} title="Reset View" />
        </div>

        {/* Pan Controls */}
        <div className="flex flex-col items-center bg-white/90 backdrop-blur-sm rounded-lg border border-slate-200 shadow-sm p-1 pointer-events-auto">
          <ControlButton onClick={() => handlePan(0, 100)} icon={<ChevronUp className="w-4 h-4" />} className="rounded" title="Pan Up" />
          <div className="flex gap-1 mt-1">
            <ControlButton onClick={() => handlePan(100, 0)} icon={<ChevronLeft className="w-4 h-4" />} className="rounded" title="Pan Left" />
            <div className="w-8 h-8" />
            <ControlButton onClick={() => handlePan(-100, 0)} icon={<ChevronRight className="w-4 h-4" />} className="rounded" title="Pan Right" />
          </div>
          <ControlButton onClick={() => handlePan(0, -100)} icon={<ChevronDown className="w-4 h-4" />} className="rounded mt-1" title="Pan Down" />
        </div>
      </div>

      <div className="absolute bottom-4 right-4 bg-white/80 backdrop-blur p-2 rounded-lg border border-slate-200 text-[10px] font-mono text-slate-500 shadow-sm pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
        Click to add points • Drag to pan • Scroll to zoom
      </div>
    </div>
  );
}

function ControlButton({ 
  onClick, 
  icon, 
  title, 
  className 
}: { 
  onClick: () => void; 
  icon: React.ReactNode; 
  title?: string; 
  className?: string; 
}) {
  return (
    <button 
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      title={title}
      className={`w-8 h-8 flex items-center justify-center hover:bg-slate-100 text-slate-600 transition-colors ${className}`}
    >
      {icon}
    </button>
  );
}
