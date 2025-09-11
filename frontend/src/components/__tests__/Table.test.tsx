/**
 * @file Table component tests
 * Tests for the reusable Table component with sorting, pagination, and accessibility
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Table } from '../Table';

interface TestData {
  id: string;
  name: string;
  amount: number;
  date: string;
}

const mockData: TestData[] = [
  { id: '1', name: 'Item 1', amount: 100, date: '2024-01-01' },
  { id: '2', name: 'Item 2', amount: 200, date: '2024-01-02' },
  { id: '3', name: 'Item 3', amount: 300, date: '2024-01-03' },
];

const mockColumns: Column<TestData>[] = [
  { key: 'name', header: 'Name', sortable: true },
  { key: 'amount', header: 'Amount', sortable: true, align: 'right', render: (value) => `$${value}` },
  { key: 'date', header: 'Date', sortable: false },
];

const mockPagination: PaginationInfo = {
  page: 1,
  page_size: 10,
  total_count: 3,
  total_pages: 1,
  has_next: false,
  has_prev: false,
};

describe('Table Component', () => {
  it('renders table with data', () => {
    render(
      <Table
        data={mockData}
        columns={mockColumns}
        aria-label="Test table"
      />
    );

    expect(screen.getByLabelText('Test table')).toBeInTheDocument();
    expect(screen.getByText('Item 1')).toBeInTheDocument();
    expect(screen.getByText('$100')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    render(
      <Table
        data={[]}
        columns={mockColumns}
        loading={true}
      />
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('shows empty state with custom message', () => {
    const emptyMessage = 'No items found';
    render(
      <Table
        data={[]}
        columns={mockColumns}
        emptyMessage={emptyMessage}
      />
    );

    expect(screen.getByText(emptyMessage)).toBeInTheDocument();
  });

  it('handles sorting', async () => {
    const onSort = vi.fn();
    const user = userEvent.setup();

    render(
      <Table
        data={mockData}
        columns={mockColumns}
        onSort={onSort}
        sortBy="name"
        sortOrder="desc"
      />
    );

    const nameHeader = screen.getByText('Name').closest('th');
    expect(nameHeader).toHaveAttribute('aria-sort', 'descending');

    await user.click(nameHeader!);
    expect(onSort).toHaveBeenCalledWith('name', 'asc');
  });

  it('handles keyboard navigation for sorting', async () => {
    const onSort = vi.fn();

    render(
      <Table
        data={mockData}
        columns={mockColumns}
        onSort={onSort}
      />
    );

    const nameHeader = screen.getByText('Name').closest('th');
    nameHeader?.focus();

    fireEvent.keyDown(nameHeader!, { key: 'Enter' });
    expect(onSort).toHaveBeenCalledWith('name', 'desc');

    fireEvent.keyDown(nameHeader!, { key: ' ' });
    expect(onSort).toHaveBeenCalledWith('name', 'desc');
  });

  it('handles row clicks', async () => {
    const onRowClick = vi.fn();
    const user = userEvent.setup();

    render(
      <Table
        data={mockData}
        columns={mockColumns}
        onRowClick={onRowClick}
      />
    );

    const firstRow = screen.getByRole('button', { name: 'View details for row 1' });
    await user.click(firstRow);

    expect(onRowClick).toHaveBeenCalledWith(mockData[0]);
  });

  it('handles keyboard navigation for row selection', async () => {
    const onRowClick = vi.fn();

    render(
      <Table
        data={mockData}
        columns={mockColumns}
        onRowClick={onRowClick}
      />
    );

    const firstRow = screen.getByRole('button', { name: 'View details for row 1' });
    firstRow.focus();

    fireEvent.keyDown(firstRow, { key: 'Enter' });
    expect(onRowClick).toHaveBeenCalledWith(mockData[0]);

    fireEvent.keyDown(firstRow, { key: ' ', preventDefault: vi.fn() });
    expect(onRowClick).toHaveBeenCalledTimes(2);
  });

  it('renders pagination', () => {
    const onPageChange = vi.fn();

    render(
      <Table
        data={mockData}
        columns={mockColumns}
        pagination={mockPagination}
        onPageChange={onPageChange}
      />
    );

    expect(screen.getByText('Showing 1 to 3 of 3 results')).toBeInTheDocument();
  });

  it('handles pagination clicks', async () => {
    const onPageChange = vi.fn();
    const user = userEvent.setup();

    const paginationWithNext: PaginationInfo = {
      ...mockPagination,
      page: 1,
      total_pages: 3,
      has_next: true,
    };

    render(
      <Table
        data={mockData}
        columns={mockColumns}
        pagination={paginationWithNext}
        onPageChange={onPageChange}
      />
    );

    const nextButton = screen.getByLabelText('Next page');
    await user.click(nextButton);

    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it('disables pagination buttons correctly', () => {
    render(
      <Table
        data={mockData}
        columns={mockColumns}
        pagination={mockPagination}
        onPageChange={vi.fn()}
      />
    );

    expect(screen.getByLabelText('Previous page')).toBeDisabled();
    expect(screen.getByLabelText('Next page')).toBeDisabled();
  });

  it('applies custom column alignment', () => {
    render(
      <Table
        data={mockData}
        columns={mockColumns}
      />
    );

    // Amount column should be right-aligned
    const amountHeader = screen.getByText('Amount').closest('th');
    expect(amountHeader).toHaveClass('text-right');
  });

  it('supports custom render functions', () => {
    render(
      <Table
        data={mockData}
        columns={mockColumns}
      />
    );

    // Amount column uses custom render function
    expect(screen.getByText('$100')).toBeInTheDocument();
    expect(screen.getByText('$200')).toBeInTheDocument();
  });

  it('handles non-sortable columns', () => {
    render(
      <Table
        data={mockData}
        columns={mockColumns}
      />
    );

    const dateHeader = screen.getByText('Date').closest('th');
    expect(dateHeader).toHaveAttribute('aria-sort', 'none');
    expect(dateHeader).not.toHaveAttribute('tabindex');
  });

  it('maintains accessibility attributes', () => {
    render(
      <Table
        data={mockData}
        columns={mockColumns}
        aria-label="Accessible table"
      />
    );

    const table = screen.getByRole('table');
    expect(table).toHaveAttribute('aria-label', 'Accessible table');

    // Check column headers have proper scope
    mockColumns.forEach((column) => {
      const header = screen.getByText(column.header).closest('th');
      expect(header).toHaveAttribute('scope', 'col');
    });
  });
});
