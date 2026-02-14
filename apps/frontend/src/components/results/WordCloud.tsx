import { useState, useEffect } from 'react';
import WordCloudVis from '@visx/wordcloud/lib/Wordcloud';
import { Text } from '@visx/text';

interface WordData {
  text: string;
  value: number;
}

interface WordCloudProps {
  words: WordData[];
  width?: number;
  height?: number;
}

const COLORS = ['#1e40af', '#1d4ed8', '#2563eb', '#3b82f6', '#60a5fa', '#93c5fd'];

function getColor(value: number, maxValue: number): string {
  const ratio = value / maxValue;
  const idx = Math.min(Math.floor(ratio * COLORS.length), COLORS.length - 1);
  return COLORS[COLORS.length - 1 - idx]; // darker = more frequent
}

export default function WordCloud({ words, width = 600, height = 300 }: WordCloudProps) {
  const [containerWidth, setContainerWidth] = useState(width);

  // Responsive: detect actual width
  useEffect(() => {
    const handleResize = () => {
      const el = document.getElementById('wordcloud-container');
      if (el) setContainerWidth(Math.min(el.clientWidth, width));
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [width]);

  if (words.length === 0) {
    return (
      <p className="text-sm text-gray-400 text-center py-8">
        No narrative data available for word cloud.
      </p>
    );
  }

  const maxValue = Math.max(...words.map((w) => w.value));
  const fontScale = (value: number) => {
    const min = 12;
    const max = 48;
    return min + ((value / maxValue) * (max - min));
  };

  return (
    <div id="wordcloud-container" className="w-full">
      <div className="flex justify-center">
        <WordCloudVis
          words={words}
          width={containerWidth}
          height={height}
          fontSize={(w) => fontScale(w.value)}
          font="Inter, system-ui, sans-serif"
          padding={2}
          spiral="archimedean"
          rotate={0}
          random={() => 0.5}
        >
          {(cloudWords) =>
            cloudWords.map((w, i) => (
              <Text
                key={`${w.text}-${i}`}
                fill={getColor(words.find((wd) => wd.text === w.text)?.value || 1, maxValue)}
                textAnchor="middle"
                transform={`translate(${w.x}, ${w.y}) rotate(${w.rotate})`}
                fontSize={w.size}
                fontFamily={w.font}
                fontWeight={w.size && w.size > 30 ? 700 : 500}
              >
                {w.text}
              </Text>
            ))
          }
        </WordCloudVis>
      </div>

      {/* Screen-reader accessible table */}
      <table className="sr-only">
        <caption>Top words from narrative responses</caption>
        <thead>
          <tr>
            <th scope="col">Word</th>
            <th scope="col">Frequency</th>
          </tr>
        </thead>
        <tbody>
          {words.slice(0, 20).map((w) => (
            <tr key={w.text}>
              <td>{w.text}</td>
              <td>{w.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
