
"use client";

import React, { useState, useEffect } from 'react';
import Image from 'next/image';

// Types for template components
type ComponentStyle = React.CSSProperties & {
  top?: string | number;
  left?: string | number;
  right?: string | number;
  bottom?: string | number;
};

interface BaseComponent {
  id: string;
  type: string;
  style: ComponentStyle;
}

interface TextComponent extends BaseComponent {
  type: 'text';
  content: string;
}

interface ImageComponent extends BaseComponent {
  type: 'image';
  src: string;
  aiHint?: string;
}

interface ShapeComponent extends BaseComponent {
  type: 'shape';
  shape: 'rectangle' | 'ellipse';
}

interface BackgroundComponent {
  type: 'background';
  style: {
    backgroundColor?: string;
    backgroundImage?: string;
  };
}

type TemplateComponent = TextComponent | ImageComponent | ShapeComponent;
type AllComponents = TemplateComponent | BackgroundComponent;


export interface PosterTemplate {
  id: string;
  name: string;
  width: number;
  height: number;
  components: AllComponents[];
}

interface EditablePosterProps {
  template: PosterTemplate;
}

const EditablePoster: React.FC<EditablePosterProps> = ({ template }) => {
  const { width, height, components: initialComponents } = template;
  const [components, setComponents] = useState(initialComponents);

  useEffect(() => {
    setComponents(initialComponents);
  }, [initialComponents]);

  const handleTextChange = (componentId: string, newContent: string) => {
    setComponents(prevComponents =>
      prevComponents.map(c =>
        c.id === componentId && c.type === 'text' ? { ...c, content: newContent } : c
      )
    );
  };

  const background = components.find(c => c.type === 'background') as BackgroundComponent | undefined;
  const renderableComponents = components.filter(c => c.type !== 'background') as TemplateComponent[];

  return (
    <div
      className="relative w-full h-full overflow-hidden"
      style={{
        aspectRatio: `${width} / ${height}`,
        backgroundColor: background?.style.backgroundColor,
        backgroundImage: background?.style.backgroundImage,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {renderableComponents.map((component) => {
        const { id, type, style } = component;

        const combinedStyle: React.CSSProperties = {
          position: 'absolute',
          ...style,
        };

        switch (type) {
          case 'text':
            const textComponent = component as TextComponent;
            return (
              <div
                key={id}
                style={combinedStyle}
                contentEditable
                suppressContentEditableWarning={true}
                onBlur={(e) => handleTextChange(id, e.currentTarget.innerText)}
                className="focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 cursor-pointer p-1"
              >
                {textComponent.content}
              </div>
            );

          case 'image':
            const imageComponent = component as ImageComponent;
            return (
              <div key={id} style={combinedStyle}>
                 <Image
                    src={imageComponent.src}
                    alt={imageComponent.id}
                    fill
                    style={{ objectFit: style.objectFit as any || 'cover' }}
                    data-ai-hint={imageComponent.aiHint}
                  />
              </div>
            );
            
          case 'shape':
            return (
                <div key={id} style={combinedStyle}></div>
            );

          default:
            return null;
        }
      })}
    </div>
  );
};

export default EditablePoster;
