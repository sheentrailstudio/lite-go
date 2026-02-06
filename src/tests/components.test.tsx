import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Order, Participant, Item, CartItem, User, Attribute, AttributeOption } from '../lib/definitions';

// ============================================================
// MOCKS
// ============================================================

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLProps<HTMLDivElement>) => <div {...props}>{children}</div>,
    span: ({ children, ...props }: React.HTMLProps<HTMLSpanElement>) => <span {...props}>{children}</span>,
    button: ({ children, ...props }: React.HTMLProps<HTMLButtonElement>) => <button {...props}>{children}</button>,
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useMotionValue: () => ({ get: () => 0, set: () => {} }),
  useTransform: () => 0,
  animate: () => ({ stop: () => {} }),
}));

// Mock next/image
vi.mock('next/image', () => ({
  default: ({ src, alt, ...props }: { src: string; alt: string }) => (
    <img src={typeof src === 'string' ? src : ''} alt={alt} {...props} />
  ),
}));

// Mock toast hook
const mockToast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
  toast: (...args: unknown[]) => mockToast(...args),
}));

// Mock generateOrderCSV utility
const mockGenerateOrderCSV = vi.fn();
vi.mock('@/lib/utils', async () => {
  const actual = await vi.importActual('@/lib/utils');
  return {
    ...actual,
    generateOrderCSV: (...args: unknown[]) => mockGenerateOrderCSV(...args),
  };
});

// ============================================================
// HELPER FACTORIES FOR TEST DATA
// ============================================================

const createUser = (overrides: Partial<User> = {}): User => ({
  id: 'user-1',
  name: 'Test User',
  email: 'test@example.com',
  avatarUrl: 'https://example.com/avatar.png',
  createdAt: '2024-01-01T00:00:00Z',
  ...overrides,
});

const createAttributeOption = (overrides: Partial<AttributeOption> = {}): AttributeOption => ({
  id: 'opt-1',
  value: 'Small',
  price: 0,
  ...overrides,
});

const createAttribute = (overrides: Partial<Attribute> = {}): Attribute => ({
  id: 'attr-1',
  name: 'Size',
  options: [createAttributeOption()],
  ...overrides,
});

const createItem = (overrides: Partial<Item> = {}): Item => ({
  id: 'item-1',
  name: 'Test Item',
  price: 100,
  ...overrides,
});

const createCartItem = (overrides: Partial<CartItem> = {}): CartItem => ({
  item: createItem(),
  quantity: 1,
  ...overrides,
});

const createParticipant = (overrides: Partial<Participant> = {}): Participant => ({
  id: 'participant-1',
  user: createUser(),
  items: [createCartItem()],
  totalCost: 100,
  paid: false,
  ...overrides,
});

const createOrder = (overrides: Partial<Order> = {}): Order => ({
  id: 'order-1',
  name: 'Test Order',
  description: 'A test order',
  status: 'open',
  visibility: 'public',
  initiatorId: 'user-1',
  initiatorName: 'Test User',
  createdAt: '2024-01-01T00:00:00Z',
  initiator: createUser(),
  participants: [createParticipant()],
  availableItems: [createItem()],
  ...overrides,
});

// ============================================================
// EXPORT VIEW COMPONENT TESTS
// ============================================================

describe('ExportView Component', () => {
  let ExportView: typeof import('../components/orders/export-view').default;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockGenerateOrderCSV.mockReturnValue('header\nrow1\nrow2');
    
    // Dynamic import to ensure mocks are applied
    const module = await import('../components/orders/export-view');
    ExportView = module.default;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Rendering', () => {
    it('should render the export card with title', () => {
      const order = createOrder();
      render(<ExportView order={order} />);
      
      expect(screen.getByText('數據匯出')).toBeInTheDocument();
    });

    it('should render description text', () => {
      const order = createOrder();
      render(<ExportView order={order} />);
      
      expect(screen.getByText('匯出訂單明細至 Excel 或試算表。')).toBeInTheDocument();
    });

    it('should render download CSV button', () => {
      const order = createOrder();
      render(<ExportView order={order} />);
      
      expect(screen.getByText('下載 CSV')).toBeInTheDocument();
    });

    it('should render copy data button', () => {
      const order = createOrder();
      render(<ExportView order={order} />);
      
      expect(screen.getByText('複製數據')).toBeInTheDocument();
    });
  });

  describe('CSV Download Functionality', () => {
    it('should call generateOrderCSV when download button is clicked', async () => {
      const order = createOrder();
      render(<ExportView order={order} />);
      
      const downloadButton = screen.getByText('下載 CSV');
      await userEvent.click(downloadButton);
      
      expect(mockGenerateOrderCSV).toHaveBeenCalledWith(order);
    });

    it('should create download link with correct filename format', async () => {
      const order = createOrder({ name: 'Tea Party' });
      
      // Mock createElement and appendChild
      const mockLink = {
        setAttribute: vi.fn(),
        click: vi.fn(),
      };
      const originalCreateElement = document.createElement.bind(document);
      vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
        if (tag === 'a') return mockLink as unknown as HTMLAnchorElement;
        return originalCreateElement(tag);
      });
      vi.spyOn(document.body, 'appendChild').mockImplementation(() => null as unknown as Node);
      vi.spyOn(document.body, 'removeChild').mockImplementation(() => null as unknown as Node);
      vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test-url');

      render(<ExportView order={order} />);
      
      const downloadButton = screen.getByText('下載 CSV');
      await userEvent.click(downloadButton);
      
      // Verify download attribute was set with order name
      expect(mockLink.setAttribute).toHaveBeenCalledWith(
        'download',
        expect.stringContaining('LiteGo_Order_Tea Party_')
      );
    });

    it('should show success toast after successful download', async () => {
      const order = createOrder();
      
      // Mock DOM methods
      vi.spyOn(document, 'createElement').mockReturnValue({
        setAttribute: vi.fn(),
        click: vi.fn(),
      } as unknown as HTMLElement);
      vi.spyOn(document.body, 'appendChild').mockImplementation(() => null as unknown as Node);
      vi.spyOn(document.body, 'removeChild').mockImplementation(() => null as unknown as Node);
      vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test-url');

      render(<ExportView order={order} />);
      
      const downloadButton = screen.getByText('下載 CSV');
      await userEvent.click(downloadButton);
      
      expect(mockToast).toHaveBeenCalledWith({
        title: '匯出成功',
        description: 'CSV 檔案已下載。',
      });
    });

    it('should show error toast when CSV generation fails', async () => {
      const order = createOrder();
      mockGenerateOrderCSV.mockImplementation(() => {
        throw new Error('Generation failed');
      });

      render(<ExportView order={order} />);
      
      const downloadButton = screen.getByText('下載 CSV');
      await userEvent.click(downloadButton);
      
      expect(mockToast).toHaveBeenCalledWith({
        title: '匯出失敗',
        variant: 'destructive',
      });
    });
  });

  describe('Copy to Clipboard Functionality', () => {
    beforeEach(() => {
      // Mock clipboard API
      Object.assign(navigator, {
        clipboard: {
          writeText: vi.fn().mockResolvedValue(undefined),
        },
      });
    });

    it('should call generateOrderCSV when copy button is clicked', async () => {
      const order = createOrder();
      render(<ExportView order={order} />);
      
      const copyButton = screen.getByText('複製數據');
      await userEvent.click(copyButton);
      
      expect(mockGenerateOrderCSV).toHaveBeenCalledWith(order);
    });

    it('should copy CSV data to clipboard', async () => {
      const order = createOrder();
      const csvData = 'test,csv,data';
      mockGenerateOrderCSV.mockReturnValue(csvData);

      render(<ExportView order={order} />);
      
      const copyButton = screen.getByText('複製數據');
      await userEvent.click(copyButton);
      
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(csvData);
    });

    it('should show success toast after copying', async () => {
      const order = createOrder();
      render(<ExportView order={order} />);
      
      const copyButton = screen.getByText('複製數據');
      await userEvent.click(copyButton);
      
      expect(mockToast).toHaveBeenCalledWith({
        title: '已複製到剪貼簿',
      });
    });
  });
});

// ============================================================
// JOIN ORDER DIALOG COMPONENT TESTS
// ============================================================

describe('JoinOrderDialog Component', () => {
  let JoinOrderDialog: typeof import('../components/orders/join-order-dialog').default;
  
  const mockOnJoin = vi.fn();

  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Dynamic import to ensure mocks are applied
    const module = await import('../components/orders/join-order-dialog');
    JoinOrderDialog = module.default;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const openDialog = async () => {
    const triggerButton = screen.getByRole('button', { name: /加入團購/i });
    await userEvent.click(triggerButton);
  };

  describe('Dialog Rendering', () => {
    it('should render trigger button', () => {
      const order = createOrder();
      render(<JoinOrderDialog order={order} onJoin={mockOnJoin} isJoining={false} />);
      
      expect(screen.getByRole('button', { name: /加入團購/i })).toBeInTheDocument();
    });

    it('should open dialog when trigger button is clicked', async () => {
      const order = createOrder({ name: 'Bubble Tea Order' });
      render(<JoinOrderDialog order={order} onJoin={mockOnJoin} isJoining={false} />);
      
      await openDialog();
      
      expect(screen.getByText('加入 Bubble Tea Order')).toBeInTheDocument();
    });

    it('should display available items in the menu', async () => {
      const order = createOrder({
        availableItems: [
          createItem({ id: 'tea-1', name: 'Green Tea', price: 30 }),
          createItem({ id: 'tea-2', name: 'Black Tea', price: 35 }),
        ],
      });
      render(<JoinOrderDialog order={order} onJoin={mockOnJoin} isJoining={false} />);
      
      await openDialog();
      
      expect(screen.getByText('Green Tea')).toBeInTheDocument();
      expect(screen.getByText('Black Tea')).toBeInTheDocument();
    });

    it('should show empty cart message initially', async () => {
      const order = createOrder();
      render(<JoinOrderDialog order={order} onJoin={mockOnJoin} isJoining={false} />);
      
      await openDialog();
      
      expect(screen.getByText('尚未選擇任何項目')).toBeInTheDocument();
    });
  });

  describe('Adding Items to Cart', () => {
    it('should add item to cart when add button is clicked (no attributes)', async () => {
      const order = createOrder({
        availableItems: [
          createItem({ id: 'tea-1', name: 'Simple Tea', price: 30, attributes: [] }),
        ],
      });
      render(<JoinOrderDialog order={order} onJoin={mockOnJoin} isJoining={false} />);
      
      await openDialog();
      
      // Find and click the add button
      const addButtons = screen.getAllByRole('button', { name: /加入/i });
      const menuAddButton = addButtons.find(btn => btn.textContent?.includes('加入') && !btn.textContent?.includes('團購'));
      if (menuAddButton) {
        await userEvent.click(menuAddButton);
      }
      
      // Item should appear in cart
      await waitFor(() => {
        expect(screen.getByText('Simple Tea')).toBeInTheDocument();
      });
    });

    it('should show validation error when required attribute not selected', async () => {
      const sizeAttr = createAttribute({
        id: 'size',
        name: '大小',
        options: [
          createAttributeOption({ id: 'small', value: 'Small', price: 0 }),
          createAttributeOption({ id: 'large', value: 'Large', price: 10 }),
        ],
      });

      const order = createOrder({
        availableItems: [
          createItem({ id: 'tea-1', name: 'Tea with Size', price: 30, attributes: [sizeAttr] }),
        ],
      });
      render(<JoinOrderDialog order={order} onJoin={mockOnJoin} isJoining={false} />);
      
      await openDialog();
      
      // Try to add without selecting size
      const addButtons = screen.getAllByRole('button', { name: /加入/i });
      const menuAddButton = addButtons.find(btn => !btn.textContent?.includes('團購'));
      if (menuAddButton) {
        await userEvent.click(menuAddButton);
      }
      
      // Should show validation error
      await waitFor(() => {
        expect(screen.getByText(/請先選擇「大小」再加入購物車/i)).toBeInTheDocument();
      });
    });

    it('should successfully add item after selecting required attribute', async () => {
      const sizeAttr = createAttribute({
        id: 'size',
        name: '大小',
        options: [
          createAttributeOption({ id: 'small', value: 'Small', price: 0 }),
          createAttributeOption({ id: 'large', value: 'Large', price: 10 }),
        ],
      });

      const order = createOrder({
        availableItems: [
          createItem({ id: 'tea-1', name: 'Tea with Options', price: 30, attributes: [sizeAttr] }),
        ],
      });
      render(<JoinOrderDialog order={order} onJoin={mockOnJoin} isJoining={false} />);
      
      await openDialog();
      
      // Select size option
      const smallOption = screen.getByLabelText('Small');
      await userEvent.click(smallOption);
      
      // Add to cart
      const addButtons = screen.getAllByRole('button', { name: /加入/i });
      const menuAddButton = addButtons.find(btn => !btn.textContent?.includes('團購'));
      if (menuAddButton) {
        await userEvent.click(menuAddButton);
      }
      
      // Should add successfully without error
      await waitFor(() => {
        expect(screen.queryByText(/請先選擇/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Cart Total Calculations', () => {
    it('should display correct total for single item', async () => {
      const order = createOrder({
        availableItems: [
          createItem({ id: 'tea-1', name: 'Green Tea', price: 50, attributes: [] }),
        ],
      });
      render(<JoinOrderDialog order={order} onJoin={mockOnJoin} isJoining={false} />);
      
      await openDialog();
      
      // Add item
      const addButtons = screen.getAllByRole('button', { name: /加入/i });
      const menuAddButton = addButtons.find(btn => !btn.textContent?.includes('團購'));
      if (menuAddButton) {
        await userEvent.click(menuAddButton);
      }
      
      // Check total displays correctly
      await waitFor(() => {
        expect(screen.getByText('$50')).toBeInTheDocument();
      });
    });

    it('should update total when quantity increases', async () => {
      const order = createOrder({
        availableItems: [
          createItem({ id: 'tea-1', name: 'Green Tea', price: 40, attributes: [] }),
        ],
      });
      render(<JoinOrderDialog order={order} onJoin={mockOnJoin} isJoining={false} />);
      
      await openDialog();
      
      // Add item twice
      const addButtons = screen.getAllByRole('button', { name: /加入/i });
      const menuAddButton = addButtons.find(btn => !btn.textContent?.includes('團購'));
      if (menuAddButton) {
        await userEvent.click(menuAddButton);
        await userEvent.click(menuAddButton);
      }
      
      // Total should be 80 (40 * 2)
      await waitFor(() => {
        expect(screen.getByText('$80')).toBeInTheDocument();
      });
    });

    it('should update total when quantity decreases', async () => {
      const order = createOrder({
        availableItems: [
          createItem({ id: 'tea-1', name: 'Green Tea', price: 30, attributes: [] }),
        ],
      });
      render(<JoinOrderDialog order={order} onJoin={mockOnJoin} isJoining={false} />);
      
      await openDialog();
      
      // Add item 3 times
      const addButtons = screen.getAllByRole('button', { name: /加入/i });
      const menuAddButton = addButtons.find(btn => !btn.textContent?.includes('團購'));
      if (menuAddButton) {
        await userEvent.click(menuAddButton);
        await userEvent.click(menuAddButton);
        await userEvent.click(menuAddButton);
      }
      
      // Now click minus button in cart
      await waitFor(() => {
        const minusButtons = screen.getAllByRole('button');
        const cartMinusButton = minusButtons.find(btn => {
          const svg = btn.querySelector('svg');
          return svg?.classList.contains('lucide-minus') || btn.querySelector('.lucide-minus');
        });
        if (cartMinusButton) {
          return userEvent.click(cartMinusButton);
        }
      });
      
      // Total should update to 60 (30 * 2)
      await waitFor(() => {
        expect(screen.getByText('$60')).toBeInTheDocument();
      });
    });

    it('should calculate total correctly with attribute price addons', async () => {
      const sizeAttr = createAttribute({
        id: 'size',
        name: 'Size',
        options: [
          createAttributeOption({ id: 'small', value: 'Small', price: 0 }),
          createAttributeOption({ id: 'large', value: 'Large', price: 20 }),
        ],
      });

      const order = createOrder({
        availableItems: [
          createItem({ id: 'tea-1', name: 'Coffee', price: 50, attributes: [sizeAttr] }),
        ],
      });
      render(<JoinOrderDialog order={order} onJoin={mockOnJoin} isJoining={false} />);
      
      await openDialog();
      
      // Select Large size (+20)
      const largeOption = screen.getByLabelText(/Large/);
      await userEvent.click(largeOption);
      
      // Add to cart
      const addButtons = screen.getAllByRole('button', { name: /加入/i });
      const menuAddButton = addButtons.find(btn => !btn.textContent?.includes('團購'));
      if (menuAddButton) {
        await userEvent.click(menuAddButton);
      }
      
      // Total should be 70 (50 + 20)
      await waitFor(() => {
        expect(screen.getByText('$70')).toBeInTheDocument();
      });
    });

    it('should handle multiple items with different attributes', async () => {
      const sizeAttr = createAttribute({
        id: 'size',
        name: 'Size',
        options: [
          createAttributeOption({ id: 'small', value: 'S', price: 0 }),
          createAttributeOption({ id: 'large', value: 'L', price: 15 }),
        ],
      });

      const order = createOrder({
        availableItems: [
          createItem({ id: 'tea-1', name: 'Tea', price: 30, attributes: [sizeAttr] }),
          createItem({ id: 'coffee-1', name: 'Coffee', price: 45, attributes: [] }),
        ],
      });
      render(<JoinOrderDialog order={order} onJoin={mockOnJoin} isJoining={false} />);
      
      await openDialog();
      
      // Add Tea with Large size (30 + 15 = 45)
      const teaLargeOption = screen.getByLabelText(/L/);
      await userEvent.click(teaLargeOption);
      
      const addButtons = screen.getAllByRole('button', { name: /加入/i });
      // Add Tea
      await userEvent.click(addButtons[0]);
      
      // Add Coffee (45)
      await userEvent.click(addButtons[1]);
      
      // Total should be 90 (45 + 45)
      await waitFor(() => {
        expect(screen.getByText('$90')).toBeInTheDocument();
      });
    });

    it('should show item count badge correctly', async () => {
      const order = createOrder({
        availableItems: [
          createItem({ id: 'tea-1', name: 'Tea', price: 30, attributes: [] }),
        ],
      });
      render(<JoinOrderDialog order={order} onJoin={mockOnJoin} isJoining={false} />);
      
      await openDialog();
      
      // Add item 3 times
      const addButtons = screen.getAllByRole('button', { name: /加入/i });
      const menuAddButton = addButtons.find(btn => !btn.textContent?.includes('團購'));
      if (menuAddButton) {
        await userEvent.click(menuAddButton);
        await userEvent.click(menuAddButton);
        await userEvent.click(menuAddButton);
      }
      
      // Item count badge should show 3
      await waitFor(() => {
        expect(screen.getByText('3')).toBeInTheDocument();
      });
    });

    it('should update total to 0 when all items removed', async () => {
      const order = createOrder({
        availableItems: [
          createItem({ id: 'tea-1', name: 'Tea', price: 30, attributes: [] }),
        ],
      });
      render(<JoinOrderDialog order={order} onJoin={mockOnJoin} isJoining={false} />);
      
      await openDialog();
      
      // Add item
      const addButtons = screen.getAllByRole('button', { name: /加入/i });
      const menuAddButton = addButtons.find(btn => !btn.textContent?.includes('團購'));
      if (menuAddButton) {
        await userEvent.click(menuAddButton);
      }
      
      // Wait for item to appear
      await waitFor(() => {
        expect(screen.getByText('$30')).toBeInTheDocument();
      });
      
      // Remove item via minus button (should remove completely since quantity is 1)
      const allButtons = screen.getAllByRole('button');
      // Looking for the minus button in cart
      for (const btn of allButtons) {
        if (btn.querySelector('.lucide-minus') || btn.textContent === '−') {
          await userEvent.click(btn);
          break;
        }
      }
      
      // Should show empty state and $0
      await waitFor(() => {
        expect(screen.getByText('$0')).toBeInTheDocument();
        expect(screen.getByText('尚未選擇任何項目')).toBeInTheDocument();
      });
    });
  });

  describe('Confirm and Submit', () => {
    it('should show validation error when trying to confirm with empty cart', async () => {
      const order = createOrder();
      render(<JoinOrderDialog order={order} onJoin={mockOnJoin} isJoining={false} />);
      
      await openDialog();
      
      // Try to confirm with empty cart
      const confirmButton = screen.getByRole('button', { name: /確認加入/i });
      await userEvent.click(confirmButton);
      
      // Should show error
      await waitFor(() => {
        expect(screen.getByText('請至少選擇一個項目')).toBeInTheDocument();
      });
    });

    it('should call onJoin with cart items when confirmed', async () => {
      const order = createOrder({
        availableItems: [
          createItem({ id: 'tea-1', name: 'Tea', price: 30, attributes: [] }),
        ],
      });
      render(<JoinOrderDialog order={order} onJoin={mockOnJoin} isJoining={false} />);
      
      await openDialog();
      
      // Add item
      const addButtons = screen.getAllByRole('button', { name: /加入/i });
      const menuAddButton = addButtons.find(btn => !btn.textContent?.includes('團購'));
      if (menuAddButton) {
        await userEvent.click(menuAddButton);
      }
      
      // Confirm
      await waitFor(async () => {
        const confirmButton = screen.getByRole('button', { name: /確認加入/i });
        await userEvent.click(confirmButton);
      });
      
      // onJoin should be called with cart items
      expect(mockOnJoin).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            item: expect.objectContaining({ name: 'Tea', price: 30 }),
            quantity: 1,
          }),
        ])
      );
    });

    it('should show loading state when isJoining is true', async () => {
      const order = createOrder();
      render(<JoinOrderDialog order={order} onJoin={mockOnJoin} isJoining={true} />);
      
      await openDialog();
      
      expect(screen.getByText('處理中...')).toBeInTheDocument();
    });

    it('should disable confirm button when isJoining is true', async () => {
      const order = createOrder({
        availableItems: [createItem({ attributes: [] })],
      });
      render(<JoinOrderDialog order={order} onJoin={mockOnJoin} isJoining={true} />);
      
      await openDialog();
      
      // Add an item first
      const addButtons = screen.getAllByRole('button', { name: /加入/i });
      const menuAddButton = addButtons.find(btn => !btn.textContent?.includes('團購'));
      if (menuAddButton) {
        await userEvent.click(menuAddButton);
      }
      
      // Confirm button should be disabled
      const confirmButton = screen.getByText('處理中...');
      expect(confirmButton.closest('button')).toBeDisabled();
    });
  });

  describe('Dialog Reset on Close', () => {
    it('should reset cart when dialog is closed', async () => {
      const order = createOrder({
        availableItems: [
          createItem({ id: 'tea-1', name: 'Tea', price: 30, attributes: [] }),
        ],
      });
      render(<JoinOrderDialog order={order} onJoin={mockOnJoin} isJoining={false} />);
      
      // Open dialog
      await openDialog();
      
      // Add items
      const addButtons = screen.getAllByRole('button', { name: /加入/i });
      const menuAddButton = addButtons.find(btn => !btn.textContent?.includes('團購'));
      if (menuAddButton) {
        await userEvent.click(menuAddButton);
        await userEvent.click(menuAddButton);
      }
      
      // Verify total is 60
      await waitFor(() => {
        expect(screen.getByText('$60')).toBeInTheDocument();
      });
      
      // Close dialog via cancel button
      const cancelButton = screen.getByRole('button', { name: /取消/i });
      await userEvent.click(cancelButton);
      
      // Reopen dialog
      await openDialog();
      
      // Cart should be empty
      await waitFor(() => {
        expect(screen.getByText('$0')).toBeInTheDocument();
        expect(screen.getByText('尚未選擇任何項目')).toBeInTheDocument();
      });
    });
  });
});

// ============================================================
// GRACEFUL DEGRADATION TESTS (Firebase Data Handling)
// ============================================================

describe('Graceful Degradation - Component Resilience', () => {
  let ExportView: typeof import('../components/orders/export-view').default;
  let JoinOrderDialog: typeof import('../components/orders/join-order-dialog').default;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockGenerateOrderCSV.mockReturnValue('headers\n');
    
    const exportModule = await import('../components/orders/export-view');
    ExportView = exportModule.default;
    
    const joinModule = await import('../components/orders/join-order-dialog');
    JoinOrderDialog = joinModule.default;
  });

  describe('ExportView with Missing/Delayed Data', () => {
    it('should render without crashing when order has no participants', () => {
      const order = createOrder({ participants: [] });
      
      expect(() => render(<ExportView order={order} />)).not.toThrow();
      expect(screen.getByText('數據匯出')).toBeInTheDocument();
    });

    it('should render without crashing when order has no available items', () => {
      const order = createOrder({ availableItems: [] });
      
      expect(() => render(<ExportView order={order} />)).not.toThrow();
      expect(screen.getByText('下載 CSV')).toBeInTheDocument();
    });

    it('should handle order with undefined optional fields', () => {
      const order = createOrder({
        deadline: undefined,
        targetAmount: undefined,
        image: undefined,
        enableStatusTracking: undefined,
        statusUpdates: undefined,
      });
      
      expect(() => render(<ExportView order={order} />)).not.toThrow();
    });

    it('should handle participant with empty items array', () => {
      const order = createOrder({
        participants: [
          createParticipant({ items: [] }),
        ],
      });
      
      expect(() => render(<ExportView order={order} />)).not.toThrow();
    });

    it('should handle items with undefined attributes', () => {
      const order = createOrder({
        participants: [
          createParticipant({
            items: [
              createCartItem({
                item: createItem({ attributes: undefined }),
                selectedAttributes: undefined,
              }),
            ],
          }),
        ],
      });
      
      expect(() => render(<ExportView order={order} />)).not.toThrow();
    });
  });

  describe('JoinOrderDialog with Missing/Delayed Data', () => {
    const mockOnJoin = vi.fn();

    it('should render without crashing when availableItems is empty', () => {
      const order = createOrder({ availableItems: [] });
      
      expect(() => 
        render(<JoinOrderDialog order={order} onJoin={mockOnJoin} isJoining={false} />)
      ).not.toThrow();
    });

    it('should show dialog correctly even with no items to display', async () => {
      const order = createOrder({ availableItems: [] });
      render(<JoinOrderDialog order={order} onJoin={mockOnJoin} isJoining={false} />);
      
      const triggerButton = screen.getByRole('button', { name: /加入團購/i });
      await userEvent.click(triggerButton);
      
      // Dialog should open and show empty cart
      expect(screen.getByText('尚未選擇任何項目')).toBeInTheDocument();
    });

    it('should handle item with empty attributes array', async () => {
      const order = createOrder({
        availableItems: [
          createItem({ name: 'Simple Item', attributes: [] }),
        ],
      });
      render(<JoinOrderDialog order={order} onJoin={mockOnJoin} isJoining={false} />);
      
      const triggerButton = screen.getByRole('button', { name: /加入團購/i });
      await userEvent.click(triggerButton);
      
      // Should render item without attributes section
      expect(screen.getByText('Simple Item')).toBeInTheDocument();
    });

    it('should handle item with attribute having no options', async () => {
      const emptyAttr = createAttribute({
        id: 'empty',
        name: 'Empty Options',
        options: [],
      });
      
      const order = createOrder({
        availableItems: [
          createItem({ name: 'Weird Item', attributes: [emptyAttr] }),
        ],
      });
      
      expect(() => 
        render(<JoinOrderDialog order={order} onJoin={mockOnJoin} isJoining={false} />)
      ).not.toThrow();
    });

    it('should handle item images being undefined', async () => {
      const order = createOrder({
        availableItems: [
          createItem({ name: 'No Image Item', images: undefined }),
        ],
      });
      render(<JoinOrderDialog order={order} onJoin={mockOnJoin} isJoining={false} />);
      
      const triggerButton = screen.getByRole('button', { name: /加入團購/i });
      await userEvent.click(triggerButton);
      
      expect(screen.getByText('No Image Item')).toBeInTheDocument();
    });

    it('should handle item images being empty array', async () => {
      const order = createOrder({
        availableItems: [
          createItem({ name: 'Empty Images Item', images: [] }),
        ],
      });
      render(<JoinOrderDialog order={order} onJoin={mockOnJoin} isJoining={false} />);
      
      const triggerButton = screen.getByRole('button', { name: /加入團購/i });
      await userEvent.click(triggerButton);
      
      expect(screen.getByText('Empty Images Item')).toBeInTheDocument();
    });

    it('should handle price being 0', async () => {
      const order = createOrder({
        availableItems: [
          createItem({ name: 'Free Item', price: 0 }),
        ],
      });
      render(<JoinOrderDialog order={order} onJoin={mockOnJoin} isJoining={false} />);
      
      const triggerButton = screen.getByRole('button', { name: /加入團購/i });
      await userEvent.click(triggerButton);
      
      expect(screen.getByText('$0')).toBeInTheDocument();
    });

    it('should handle very long item names gracefully', async () => {
      const longName = 'A'.repeat(200);
      const order = createOrder({
        availableItems: [
          createItem({ name: longName }),
        ],
      });
      
      expect(() => 
        render(<JoinOrderDialog order={order} onJoin={mockOnJoin} isJoining={false} />)
      ).not.toThrow();
    });

    it('should handle special unicode characters in item names', async () => {
      const order = createOrder({
        availableItems: [
          createItem({ name: '🧋 珍珠奶茶 Bubble Tea ★彡' }),
        ],
      });
      render(<JoinOrderDialog order={order} onJoin={mockOnJoin} isJoining={false} />);
      
      const triggerButton = screen.getByRole('button', { name: /加入團購/i });
      await userEvent.click(triggerButton);
      
      expect(screen.getByText('🧋 珍珠奶茶 Bubble Tea ★彡')).toBeInTheDocument();
    });
  });

  describe('Edge Cases - Stress Testing UI Resilience', () => {
    const mockOnJoin = vi.fn();

    it('should handle rapidly clicking add button', async () => {
      const order = createOrder({
        availableItems: [
          createItem({ id: 'tea', name: 'Tea', price: 10, attributes: [] }),
        ],
      });
      render(<JoinOrderDialog order={order} onJoin={mockOnJoin} isJoining={false} />);
      
      const triggerButton = screen.getByRole('button', { name: /加入團購/i });
      await userEvent.click(triggerButton);
      
      // Rapid clicks
      const addButtons = screen.getAllByRole('button', { name: /加入/i });
      const menuAddButton = addButtons.find(btn => !btn.textContent?.includes('團購'));
      
      if (menuAddButton) {
        for (let i = 0; i < 10; i++) {
          await userEvent.click(menuAddButton);
        }
      }
      
      // Should correctly show quantity of 10 and total of 100
      await waitFor(() => {
        expect(screen.getByText('$100')).toBeInTheDocument();
        expect(screen.getByText('10')).toBeInTheDocument();
      });
    });

    it('should handle very large quantities gracefully', async () => {
      const order = createOrder({
        availableItems: [
          createItem({ id: 'tea', name: 'Tea', price: 999999, attributes: [] }),
        ],
      });
      render(<JoinOrderDialog order={order} onJoin={mockOnJoin} isJoining={false} />);
      
      const triggerButton = screen.getByRole('button', { name: /加入團購/i });
      await userEvent.click(triggerButton);
      
      // Add item multiple times
      const addButtons = screen.getAllByRole('button', { name: /加入/i });
      const menuAddButton = addButtons.find(btn => !btn.textContent?.includes('團購'));
      
      if (menuAddButton) {
        for (let i = 0; i < 5; i++) {
          await userEvent.click(menuAddButton);
        }
      }
      
      // Should calculate large total correctly
      await waitFor(() => {
        expect(screen.getByText('$4999995')).toBeInTheDocument();
      });
    });

    it('should handle concurrent attribute selection and item addition', async () => {
      const sizeAttr = createAttribute({
        id: 'size',
        name: 'Size',
        options: [
          createAttributeOption({ id: 's', value: 'S', price: 0 }),
          createAttributeOption({ id: 'l', value: 'L', price: 10 }),
        ],
      });

      const order = createOrder({
        availableItems: [
          createItem({ id: 'tea', name: 'Tea', price: 30, attributes: [sizeAttr] }),
        ],
      });
      render(<JoinOrderDialog order={order} onJoin={mockOnJoin} isJoining={false} />);
      
      const triggerButton = screen.getByRole('button', { name: /加入團購/i });
      await userEvent.click(triggerButton);
      
      // Select S
      const sOption = screen.getByLabelText('S');
      await userEvent.click(sOption);
      
      // Add
      const addButtons = screen.getAllByRole('button', { name: /加入/i });
      const menuAddButton = addButtons.find(btn => !btn.textContent?.includes('團購'));
      if (menuAddButton) await userEvent.click(menuAddButton);
      
      // Select L
      const lOption = screen.getByLabelText(/L/);
      await userEvent.click(lOption);
      
      // Add again
      if (menuAddButton) await userEvent.click(menuAddButton);
      
      // Should have two separate cart items with different totals
      await waitFor(() => {
        // S: 30, L: 40 = 70 total
        expect(screen.getByText('$70')).toBeInTheDocument();
      });
    });
  });
});
