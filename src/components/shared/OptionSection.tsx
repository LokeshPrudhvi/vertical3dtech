import type { ProductSection } from '@/types/product';
import { useConfigStore } from '@/store/ConfigProvider';

export function OptionSection({ section }: { section: ProductSection }) {
  const selectedId = useConfigStore((s) => s.config.selectedOptions[section.id]);
  const selectOption = useConfigStore((s) => s.selectOption);

  if (section.type !== 'variant' || !section.options) return null;

  return (
    <fieldset className="option-section">
      <legend><h3>{section.label}</h3></legend>
      <div className="option-pills" role="radiogroup" aria-label={section.label}>
        {section.options.map((option) => {
          const isSelected = selectedId === option.id;
          return (
            <button
              key={option.id}
              role="radio"
              aria-checked={isSelected}
              className={`option-pill ${isSelected ? 'selected' : ''}`}
              onClick={() => selectOption(section.id, option.id)}
            >
              <span>{option.label}</span>
              {option.priceDeltaCents > 0 && (
                <span className="option-price">₹{(option.priceDeltaCents / 100).toLocaleString('en-IN')}</span>
              )}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

