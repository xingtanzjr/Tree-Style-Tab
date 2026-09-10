import { fireEvent, render, screen } from '@testing-library/react';
import ContextMenu from '../components/ContextMenu';

describe('ContextMenu', () => {
    it('opens a group list without closing, disables the current group, and selects another group', () => {
        const onClose = jest.fn();
        const move = jest.fn();
        render(<ContextMenu x={10} y={10} onClose={onClose} items={[{
            label: 'Move to group',
            children: [
                { label: 'Current group', disabled: true },
                { label: 'Other group', onClick: move },
            ],
        }]} />);
        fireEvent.click(screen.getByRole('menuitem', { name: 'Move to group' }));
        expect(onClose).not.toHaveBeenCalled();
        expect(screen.getByRole('menuitem', { name: 'Current group' })).toBeDisabled();
        fireEvent.click(screen.getByRole('menuitem', { name: 'Other group' }));
        expect(move).toHaveBeenCalledTimes(1);
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('supports keyboard navigation, submenu back, and escape to close', () => {
        const onClose = jest.fn();
        render(<ContextMenu x={10} y={10} onClose={onClose} items={[{
            label: 'Move', children: [{ label: 'Group' }],
        }]} />);
        fireEvent.keyDown(screen.getByRole('menu'), { key: 'ArrowDown' });
        expect(screen.getByRole('menuitem', { name: 'Move' })).toHaveFocus();
        fireEvent.click(screen.getByRole('menuitem', { name: 'Move' }));
        fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' });
        expect(screen.getByRole('menuitem', { name: 'Move' })).toBeInTheDocument();
        expect(onClose).not.toHaveBeenCalled();
        fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' });
        expect(onClose).toHaveBeenCalledTimes(1);
    });
});