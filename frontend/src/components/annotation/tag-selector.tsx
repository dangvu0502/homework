import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { AnnotationTag } from '@/types/annotation';
import {
  ChevronDown,
  Circle,
  MousePointer,
  Type
} from 'lucide-react';

interface TagSelectorProps {
  selectedTag: AnnotationTag;
  onTagSelect: (tag: AnnotationTag) => void;
  className?: string;
}

const tagConfig: Record<AnnotationTag, { 
  label: string; 
  icon: React.ComponentType<any>; 
  color: string;
  description: string;
}> = {
  button: { 
    label: 'Button', 
    icon: MousePointer, 
    color: 'bg-annotation-button',
    description: 'Clickable buttons and CTAs'
  },
  input: { 
    label: 'Input', 
    icon: Type, 
    color: 'bg-annotation-input',
    description: 'Text fields and form inputs'
  },
  radio: { 
    label: 'Radio', 
    icon: Circle, 
    color: 'bg-annotation-radio',
    description: 'Radio buttons and selection'
  },
  dropdown: { 
    label: 'Dropdown', 
    icon: ChevronDown, 
    color: 'bg-annotation-dropdown',
    description: 'Select menus and dropdowns'
  },
  text: { 
    label: 'Text', 
    icon: Type, 
    color: 'bg-annotation-text',
    description: 'Static text and labels'
  }
};

export const TagSelector = ({ selectedTag, onTagSelect, className }: TagSelectorProps) => {
  return (
    <Card className={`p-4 ${className}`}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Element Tags</h3>
          <Badge variant="secondary" className="text-xs">
            {selectedTag}
          </Badge>
        </div>
        
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(tagConfig).map(([tag, config]) => {
            const Icon = config.icon;
            const isSelected = selectedTag === tag;
            
            return (
              <Button
                key={tag}
                variant={isSelected ? "default" : "outline"}
                size="sm"
                onClick={() => onTagSelect(tag as AnnotationTag)}
                className={`h-auto p-3 flex flex-col gap-2 ${
                  isSelected 
                    ? 'bg-primary text-primary-foreground shadow-md' 
                    : 'hover:bg-accent'
                }`}
              >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                  isSelected ? 'bg-primary-foreground/20' : config.color + '/20'
                }`}>
                  <Icon 
                    className={`h-3 w-3 ${
                      isSelected ? 'text-primary-foreground' : 'text-current'
                    }`} 
                  />
                </div>
                <span className="text-xs font-medium">{config.label}</span>
              </Button>
            );
          })}
        </div>

        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground">
            {tagConfig[selectedTag].description}
          </p>
        </div>
      </div>
    </Card>
  );
};