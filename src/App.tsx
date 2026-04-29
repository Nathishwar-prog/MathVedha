import React, {useState, useMemo, useEffect} from 'react';
import {motion, AnimatePresence} from 'motion/react';
import {
  Plus,
  Trash2,
  Share2,
  Play,
  RotateCcw,
  BookOpen,
  Info,
  Maximize2,
  ChevronRight,
  Calculator,
  Grid,
  Settings2,
  Check
} from 'lucide-react';
import {Point, Line, Intersection} from './types';
import {
  calculateSlope,
  calculateIntercept,
  parseEquation,
  findIntersection,
  formatEquation,
  checkRelationship
} from './lib/math-utils';
import Graph from './components/Graph';
import {cn} from './lib/utils';
import confetti from 'canvas-confetti';

const COLORS = [
  '#3b82f6', // blue
  '#10b981', // emerald
  '#f59e0b', // amber
  '#8b5cf6', // violet
  '#ec4899', // pink
];

export default function App() {
  const [points, setPoints] = useState<Point[]>([]);
  const [lines, setLines] = useState<Line[]>([]);
  const [hoveredPoint, setHoveredPoint] = useState<Point | null>(null);
  const [hoveredLine, setHoveredLine] = useState<Line | null>(null);
  const [showExplain, setShowExplain] = useState(false);
  const [showPractice, setShowPractice] = useState(false);
  const [practiceQuestion, setPracticeQuestion] = useState<{q: string; a: string} | null>(null);
  const [userGuess, setUserGuess] = useState('');
  const [eqInput, setEqInput] = useState('');
  const [newThickness, setNewThickness] = useState(3);
  const [newDashStyle, setNewDashStyle] = useState<'solid' | 'dashed' | 'dotted'>('solid');
  const [newColor, setNewColor] = useState(COLORS[0]);
  const [editingLineId, setEditingLineId] = useState<string | null>(null);

  // Auto-generate lines from points
  const processedLines = useMemo(() => {
    const autoLines: Line[] = [];
    
    // Manual lines from points (every pair of points forms a line if requested or just sequential)
    if (points.length >= 2) {
      for (let i = 0; i < points.length - 1; i += 2) {
        if (points[i+1]) {
          const p1 = points[i];
          const p2 = points[i+1];
          const m = calculateSlope(p1, p2);
          const b = calculateIntercept(p1, m);
          autoLines.push({
            id: `line-p-${i}`,
            point1Id: p1.id,
            point2Id: p2.id,
            m,
            b,
            type: 'points',
            color: p1.color,
            thickness: 3,
            dashStyle: 'solid'
          });
        }
      }
    }

    // Equation-based lines
    lines.forEach(l => {
      if (l.type === 'equation') autoLines.push(l);
    });

    return autoLines;
  }, [points, lines]);

  // Calculate Intersections
  const intersections = useMemo(() => {
    const results: Intersection[] = [];
    for (let i = 0; i < processedLines.length; i++) {
      for (let j = i + 1; j < processedLines.length; j++) {
        const inter = findIntersection(processedLines[i], processedLines[j], points);
        if (inter) results.push(inter);
      }
    }
    return results;
  }, [processedLines, points]);

  const addPoint = (x: number, y: number) => {
    const newPoint: Point = {
      id: Math.random().toString(36).substr(2, 9),
      x,
      y,
      color: COLORS[points.length % COLORS.length],
      label: `P${points.length + 1}`
    };
    setPoints([...points, newPoint]);
  };

  const removePoint = (id: string) => {
    setPoints(points.filter(p => p.id !== id));
  };

  const addEquation = () => {
    const res = parseEquation(eqInput);
    if (res) {
      const newLine: Line = {
        id: Math.random().toString(36).substr(2, 9),
        type: 'equation',
        equation: eqInput,
        m: res.m,
        b: res.b,
        color: newColor,
        thickness: newThickness,
        dashStyle: newDashStyle
      };
      setLines([...lines, newLine]);
      setEqInput('');
    } else {
      alert("Invalid equation! Use y = mx + b format. Example: y = 2x + 1 or y = 5");
    }
  };

  const updateLineStyle = (id: string, thickness: number, dashStyle: 'solid' | 'dashed' | 'dotted', color?: string) => {
    setLines(lines.map(l => l.id === id ? { ...l, thickness, dashStyle, color: color || l.color } : l));
  };

  const reset = () => {
    setPoints([]);
    setLines([]);
  };

  const startPractice = () => {
    const qType = Math.floor(Math.random() * 2);
    if (qType === 0) {
      const m = Math.floor(Math.random() * 5) - 2;
      const b = Math.floor(Math.random() * 6) - 3;
      setPracticeQuestion({
        q: `What is the y-intercept of the line y = ${m === 0 ? '' : m + 'x'} ${b >= 0 ? '+' : ''}${b}?`,
        a: b.toString()
      });
    } else {
      const x = Math.floor(Math.random() * 4);
      const y = Math.floor(Math.random() * 4);
      setPracticeQuestion({
        q: `Plot a point at (${x}, ${y}). (Click the graph)`,
        a: `${x},${y}`
      });
    }
    setShowPractice(true);
  };

  const checkPractice = () => {
    if (practiceQuestion?.a === userGuess) {
      confetti();
      alert("Correct!");
      setShowPractice(false);
      setUserGuess('');
    } else {
      alert("Try again!");
    }
  };

  return (
    <div className="flex h-screen w-full bg-slate-50 font-sans text-slate-900 overflow-hidden">
      {/* Sidebar */}
      <motion.aside 
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className="w-80 border-r border-slate-200 bg-white p-6 flex flex-col gap-6 shadow-sm z-10"
      >
        <div className="flex items-center gap-2">
          <div className="p-2 bg-blue-600 rounded-lg">
            <Calculator className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-800">MathVeda</h1>
        </div>

        <div className="flex flex-col gap-4 overflow-y-auto pr-2">
          {/* Header */}
          <section>
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Equation Input</h2>
            <div className="flex gap-2 mb-2">
              <input 
                type="text" 
                value={eqInput}
                onChange={(e) => setEqInput(e.target.value)}
                placeholder="y = 2x + 1"
                className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 transition-all outline-none"
              />
              <button 
                onClick={addEquation}
                className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                title="Add Line"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            
            <div className="flex flex-col gap-2 p-2 bg-slate-50 rounded-lg border border-slate-100">
              <div className="flex items-center gap-4">
                <div className="flex flex-col gap-1 flex-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Thickness</span>
                  <input 
                    type="range" 
                    min="1" 
                    max="10" 
                    value={newThickness}
                    onChange={(e) => setNewThickness(parseInt(e.target.value))}
                    className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Style</span>
                  <select 
                    value={newDashStyle}
                    onChange={(e) => setNewDashStyle(e.target.value as any)}
                    className="text-[10px] bg-white border border-slate-200 rounded px-1 py-0.5 outline-none"
                  >
                    <option value="solid">Solid</option>
                    <option value="dashed">Dashed</option>
                    <option value="dotted">Dotted</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase w-10">Color</span>
                <div className="flex gap-1.5 flex-1">
                  {COLORS.map(c => (
                    <button
                      key={c}
                      onClick={() => setNewColor(c)}
                      className={cn(
                        "w-4 h-4 rounded-full border border-white shadow-sm transition-transform hover:scale-110",
                        newColor === c && "ring-2 ring-blue-500 ring-offset-1"
                      )}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Points List */}
          <section>
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Points ({points.length})</h2>
            <div className="space-y-2">
              {points.length === 0 && (
                <p className="text-xs text-slate-400 italic">Click on the graph to add points</p>
              )}
              {points.map(p => (
                <motion.div 
                  layout
                  key={p.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100 group"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: p.color }} />
                    <span className="text-sm font-medium">{p.label}: ({p.x}, {p.y})</span>
                  </div>
                  <button onClick={() => removePoint(p.id)} className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-500 transition-all">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </motion.div>
              ))}
            </div>
          </section>

          {/* Lines List */}
          <section>
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Lines ({processedLines.length})</h2>
            <div className="space-y-2">
              {processedLines.map(l => (
                <div key={l.id} className="p-3 rounded-lg bg-slate-50 border border-slate-100 group relative">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-lg" style={{ backgroundColor: l.color }} />
                      <span className="text-sm font-bold text-slate-700">
                        {formatEquation(l.m!, l.b!)}
                      </span>
                    </div>
                    {l.type === 'equation' && (
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => setEditingLineId(editingLineId === l.id ? null : l.id)}
                          className="p-1 text-slate-400 hover:text-blue-500 transition-colors"
                        >
                          <Settings2 className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={() => setLines(lines.filter(item => item.id !== l.id))}
                          className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  {editingLineId === l.id ? (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      className="mt-2 pt-2 border-t border-slate-200 flex flex-col gap-2"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-400 w-12">Thin</span>
                        <input 
                          type="range" 
                          min="1" 
                          max="10" 
                          value={l.thickness || 3}
                          onChange={(e) => updateLineStyle(l.id, parseInt(e.target.value), l.dashStyle || 'solid', l.color)}
                          className="flex-1 h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                        />
                        <span className="text-[10px] text-slate-400">Thick</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-400 w-12">Color</span>
                        <div className="flex gap-1.5 flex-1">
                          {COLORS.map(c => (
                            <button
                              key={c}
                              onClick={() => updateLineStyle(l.id, l.thickness || 3, l.dashStyle || 'solid', c)}
                              className={cn(
                                "w-4 h-4 rounded-full border border-white shadow-sm transition-transform",
                                l.color === c && "ring-2 ring-blue-500 ring-offset-1"
                              )}
                              style={{ backgroundColor: c }}
                            />
                          ))}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {(['solid', 'dashed', 'dotted'] as const).map(style => (
                          <button
                            key={style}
                            onClick={() => updateLineStyle(l.id, l.thickness || 3, style)}
                            className={cn(
                              "flex-1 text-[10px] py-1 rounded border transition-all capitalize",
                              l.dashStyle === style ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                            )}
                          >
                            {style}
                          </button>
                        ))}
                      </div>
                      <button 
                        onClick={() => setEditingLineId(null)}
                        className="w-full py-1 bg-slate-100 text-slate-600 text-[10px] font-bold rounded hover:bg-slate-200 mt-1"
                      >
                        Done
                      </button>
                    </motion.div>
                  ) : (
                    <div className="flex gap-3 mt-1">
                      <span className="text-[10px] text-slate-500">m = {l.m?.toFixed(2)}</span>
                      <span className="text-[10px] text-slate-500">b = {l.b?.toFixed(2)}</span>
                      <span className="text-[10px] text-slate-500 capitalize">{l.dashStyle || 'solid'}</span>
                      <span className="text-[10px] text-slate-500">{l.thickness || 3}px</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* Relationships */}
          {processedLines.length >= 2 && (
            <section className="mt-2">
              <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">A.I. Relationships</h2>
              {processedLines.map((l1, i) => 
                processedLines.slice(i + 1).map((l2) => {
                  const rel = checkRelationship(l1.m!, l2.m!);
                  if (rel === 'none') return null;
                  return (
                    <div key={`${l1.id}-${l2.id}`} className="p-2 mb-2 bg-blue-50 border border-blue-100 rounded-lg flex items-center gap-2">
                      <div className="p-1 bg-blue-100 rounded text-blue-600">
                        <Info className="w-3 h-3" />
                      </div>
                      <span className="text-[11px] font-medium text-blue-700 capitalize">
                        {rel} detected
                      </span>
                    </div>
                  );
                })
              )}
            </section>
          )}
        </div>

        {/* Footer Actions */}
        <div className="mt-auto pt-4 border-t border-slate-100 flex flex-col gap-2">
          <button 
            onClick={() => setShowExplain(!showExplain)}
            className="flex items-center justify-between px-3 py-2 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors text-sm font-medium"
          >
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              <span>Explain Mode</span>
            </div>
            <ChevronRight className={cn("w-4 h-4 transition-transform", showExplain && "rotate-90")} />
          </button>
          <button 
            onClick={startPractice}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors text-sm font-medium"
          >
            <Play className="w-4 h-4" />
            <span>Practice Mode</span>
          </button>
          <button 
            onClick={reset}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-orange-50 text-orange-600 hover:bg-orange-100 transition-colors text-sm font-medium"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reset Canvas</span>
          </button>
        </div>
      </motion.aside>

      {/* Main Graph Area */}
      <main className="flex-1 flex flex-col p-6 gap-6 relative">
        <header className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Coordinate Plane</h2>
            <p className="text-sm text-slate-500">Visualize linear systems and intersections</p>
          </div>
          <div className="flex gap-2">
            <button className="p-2 bg-white border border-slate-200 rounded-lg hover:border-slate-300 transition-all shadow-sm">
              <Share2 className="w-4 h-4 text-slate-600" />
            </button>
            <button className="p-2 bg-white border border-slate-200 rounded-lg hover:border-slate-300 transition-all shadow-sm">
              <Maximize2 className="w-4 h-4 text-slate-600" />
            </button>
          </div>
        </header>

        <div className="flex-1 min-h-0 relative">
          <Graph 
            points={points} 
            lines={processedLines} 
            intersections={intersections}
            onAddPoint={(x, y) => {
              if (showPractice && practiceQuestion?.a.includes(',')) {
                if (`${x},${y}` === practiceQuestion.a) {
                  confetti();
                  alert("Correct!");
                  setShowPractice(false);
                }
              }
              addPoint(x, y);
            }}
            onPointHover={setHoveredPoint}
            onLineHover={setHoveredLine}
            onLineClick={(l) => {
              if (l.type === 'equation') {
                setEditingLineId(l.id);
              }
            }}
          />

          {/* Hover Tooltip for Line */}
          {hoveredLine && (
            <div className="absolute top-4 left-4 bg-white/90 backdrop-blur px-3 py-2 rounded-lg border border-slate-200 shadow-lg text-xs pointer-events-none z-30">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: hoveredLine.color }} />
                <span className="font-bold text-slate-700">{formatEquation(hoveredLine.m!, hoveredLine.b!)}</span>
              </div>
              <div className="flex gap-3 text-slate-500">
                <span>m: {hoveredLine.m?.toFixed(2)}</span>
                <span>b: {hoveredLine.b?.toFixed(2)}</span>
              </div>
            </div>
          )}

          {/* Practice Mode Overlay */}
          <AnimatePresence>
            {showPractice && practiceQuestion && (
              <motion.div 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 20, opacity: 0 }}
                className="absolute top-4 left-1/2 -translate-x-1/2 w-96 bg-white rounded-xl shadow-xl border-2 border-emerald-500 p-6 z-20"
              >
                <h3 className="text-lg font-bold text-emerald-600 mb-2">Practice Mission</h3>
                <p className="text-slate-600 mb-4 font-medium">{practiceQuestion.q}</p>
                {!practiceQuestion.a.includes(',') && (
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={userGuess}
                      onChange={(e) => setUserGuess(e.target.value)}
                      className="flex-1 px-4 py-2 border rounded-lg"
                      placeholder="Your answer..."
                      autoFocus
                    />
                    <button 
                      onClick={checkPractice}
                      className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                    >
                      Verify
                    </button>
                  </div>
                )}
                <button 
                  onClick={() => setShowPractice(false)}
                  className="mt-4 text-xs text-slate-400 hover:text-slate-600 underline"
                >
                  Cancel Mission
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Explain Mode Overlay */}
          <AnimatePresence>
            {showExplain && (
              <motion.div 
                initial={{ x: 300, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 300, opacity: 0 }}
                className="absolute right-0 top-0 h-full w-80 bg-white/95 backdrop-blur border-l border-slate-200 p-6 overflow-y-auto z-20 shadow-2xl"
              >
                <div className="flex items-center gap-2 mb-6">
                  <BookOpen className="w-5 h-5 text-indigo-600" />
                  <h3 className="text-lg font-bold text-slate-800">Teacher's Insight</h3>
                </div>

                <div className="space-y-6">
                  <section>
                    <h4 className="text-sm font-bold text-indigo-600 mb-1">Slope (m)</h4>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      The slope represents the "steepness" of the line. It's calculated as <strong>Rise over Run</strong> (change in y divided by change in x).
                    </p>
                  </section>

                  <section>
                    <h4 className="text-sm font-bold text-indigo-600 mb-1">Y-Intercept (b)</h4>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      The value of y where the line crosses the vertical axis (x=0). In AI, this is often called the <strong>Bias</strong>.
                    </p>
                  </section>

                  <section>
                    <h4 className="text-sm font-bold text-indigo-600 mb-1">Intersections</h4>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Where two lines meet is the <strong>Solution</strong> to the system of equations. In Neural Networks, finding where linear boundaries cross helps define decision spaces.
                    </p>
                  </section>

                  <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100">
                    <h4 className="text-[11px] font-bold text-indigo-700 uppercase mb-2">Live Analysis</h4>
                    {processedLines.length > 0 ? (
                      <p className="text-[11px] text-indigo-600 italic">
                        "Your current line has a {Math.abs(processedLines[0].m!) > 1 ? 'steep' : 'gentle'} {processedLines[0].m! > 0 ? 'upward' : 'downward'} slope."
                      </p>
                    ) : (
                      <p className="text-[11px] text-indigo-400">Start drawing to see insights!</p>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Hover Tooltip for Point */}
          {hoveredPoint && (
            <div className="absolute top-4 left-4 bg-white/90 backdrop-blur px-3 py-2 rounded-lg border border-slate-200 shadow-lg text-xs pointer-events-none z-30">
              <span className="font-bold text-slate-700">{hoveredPoint.label}</span>
              <div className="mt-1 flex gap-2 text-slate-500">
                <span>x: {hoveredPoint.x}</span>
                <span>y: {hoveredPoint.y}</span>
              </div>
            </div>
          )}
        </div>

        {/* Stats Footer */}
        <footer className="grid grid-cols-4 gap-4">
          <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col gap-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Points</span>
            <span className="text-xl font-bold text-slate-800">{points.length}</span>
          </div>
          <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col gap-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Lines</span>
            <span className="text-xl font-bold text-slate-800">{processedLines.length}</span>
          </div>
          <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col gap-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Intersections</span>
            <span className="text-xl font-bold text-red-500">{intersections.length}</span>
          </div>
          <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col gap-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">A.I. Insight</span>
            <span className="text-xs font-medium text-slate-600 line-clamp-2">
              {intersections.length > 0 ? "Potential convergence point identified." : "Waiting for linear relationships."}
            </span>
          </div>
        </footer>
      </main>
    </div>
  );
}
