import { render, screen } from '@testing-library/react';
import HighlightLabel from '../components/HighlightLabel';

describe('HighlightLabel', () => {
    it('should render plain text without keyword', () => {
        render(<HighlightLabel className="title">Hello World</HighlightLabel>);
        expect(screen.getByText('Hello World')).toBeInTheDocument();
    });

    it('should highlight matching keyword', () => {
        const { container } = render(
            <HighlightLabel className="title" keyword="World">
                Hello World
            </HighlightLabel>
        );

        const highlighted = container.querySelector('.keyword');
        expect(highlighted).toBeInTheDocument();
        expect(highlighted.textContent).toBe('World');
    });

    it('should highlight multiple matches', () => {
        const { container } = render(
            <HighlightLabel className="title" keyword="o">
                Hello World
            </HighlightLabel>
        );

        const highlights = container.querySelectorAll('.keyword');
        expect(highlights).toHaveLength(2);
    });

    it('should be case insensitive', () => {
        const { container } = render(
            <HighlightLabel className="title" keyword="hello">
                Hello World
            </HighlightLabel>
        );

        const highlighted = container.querySelector('.keyword');
        expect(highlighted.textContent).toBe('Hello');
    });

    it('should handle empty keyword', () => {
        render(
            <HighlightLabel className="url" keyword="">
                https://example.com
            </HighlightLabel>
        );
        expect(screen.getByText('https://example.com')).toBeInTheDocument();
    });

    it('should handle invalid regex in keyword gracefully', () => {
        render(
            <HighlightLabel className="title" keyword="[invalid">
                Some text
            </HighlightLabel>
        );
        expect(screen.getByText('Some text')).toBeInTheDocument();
    });

    it('should apply className', () => {
        const { container } = render(
            <HighlightLabel className="my-class">Content</HighlightLabel>
        );
        expect(container.querySelector('.my-class')).toBeInTheDocument();
    });

    it('should handle empty children', () => {
        const { container } = render(
            <HighlightLabel className="title">{''}</HighlightLabel>
        );
        expect(container.querySelector('.title')).toBeInTheDocument();
    });
});
