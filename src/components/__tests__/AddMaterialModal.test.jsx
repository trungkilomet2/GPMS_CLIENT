import { fireEvent, render } from '@testing-library/react';
import AddMaterialModal from '@/components/AddMaterialModal';

describe('AddMaterialModal', () => {
  it('does not render when closed', () => {
    const { container } = render(
      <AddMaterialModal
        isOpen={false}
        onClose={vi.fn()}
        onSave={vi.fn()}
        formData={{}}
        onChange={vi.fn()}
        editingIndex={null}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it('validates required fields before save', () => {
    const onSave = vi.fn();
    const { container } = render(
      <AddMaterialModal
        isOpen
        onClose={vi.fn()}
        onSave={onSave}
        formData={{ materialName: '', quantity: '', uom: '' }}
        onChange={vi.fn()}
        editingIndex={null}
      />
    );

    fireEvent.click(container.querySelectorAll('button')[1]);
    expect(onSave).not.toHaveBeenCalled();
  });

  it('calls onSave when data is valid', () => {
    const onSave = vi.fn();
    const { container } = render(
      <AddMaterialModal
        isOpen
        onClose={vi.fn()}
        onSave={onSave}
        formData={{ materialName: 'Vai cotton', quantity: '10', uom: 'Mét' }}
        onChange={vi.fn()}
        editingIndex={null}
      />
    );

    fireEvent.click(container.querySelectorAll('button')[1]);
    expect(onSave).toHaveBeenCalledTimes(1);
  });
});
