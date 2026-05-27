# Performance Optimization

---

## useMemo — Expensive Computations

```typescript
// ❌ Runs on every render
const filteredItems = items
  .filter(item => item.name.includes(searchTerm))
  .sort((a, b) => a.name.localeCompare(b.name));

// ✅ Only recalculates when dependencies change
const filteredItems = useMemo(() =>
  items
    .filter(item => item.name.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name)),
  [items, searchTerm]
);
```

**Use when:** filtering/sorting large arrays, expensive transformations, derived data structures.  
**Skip when:** simple arithmetic, string concatenation, or the data is already small.

---

## useCallback — Stable Function References

```typescript
// ❌ New function reference on every render → child always re-renders
const handleClick = (id: string) => doSomething(id);

// ✅ Stable reference
const handleClick = useCallback((id: string) => {
  doSomething(id);
}, []);
```

**Use when:** function is passed as a prop, used in a `useEffect` dependency array, or passed to a `React.memo` component.  
**Skip when:** handler is inline and never leaves the component.

---

## React.memo — Prevent Child Re-renders

```typescript
interface IListItemProps {
  item: IItem;
  onAction: (id: string) => void;
}

const ListItem = React.memo<IListItemProps>(({ item, onAction }) => (
  <div onClick={() => onAction(item.id)}>{item.name}</div>
));

export const ItemList: React.FC<{ items: IItem[] }> = ({ items }) => {
  const handleAction = useCallback((id: string) => {
    console.log('Action:', id);
  }, []);

  return (
    <div>
      {items.map(item => (
        <ListItem key={item.id} item={item} onAction={handleAction} />
      ))}
    </div>
  );
};
```

**Use when:** component renders frequently, has expensive rendering, or is a list item.  
**Skip when:** props change on every render anyway — memo overhead outweighs the benefit.

---

## Debounced Search with Apollo

```typescript
export const SearchComponent: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedTerm] = useDebounce(searchTerm, 300);

  const { data } = useQuery(SEARCH_QUERY, {
    variables: { term: debouncedTerm },
    skip: debouncedTerm.length === 0,
  });

  return (
    <input
      value={searchTerm}
      onChange={e => setSearchTerm(e.target.value)}
      placeholder="Search..."
    />
  );
};
```

**Debounce timing:**
| Use case | Delay |
|----------|-------|
| Search / filter | 300–500ms |
| Real-time validation | 100–200ms |
| Auto-save | 1000ms |

---

## Memory Leak Prevention

Always return a cleanup function from `useEffect` for anything that outlives the render:

```typescript
// Intervals
useEffect(() => {
  const id = setInterval(() => tick(), 1000);
  return () => clearInterval(id);
}, []);

// Timeouts
useEffect(() => {
  const id = setTimeout(() => doSomething(), 5000);
  return () => clearTimeout(id);
}, []);

// Event listeners
useEffect(() => {
  const handleResize = () => recalculate();
  window.addEventListener('resize', handleResize);
  return () => window.removeEventListener('resize', handleResize);
}, []);
```

> Apollo subscriptions clean up automatically when the component unmounts — no manual abort needed.

---

## Form — Watch Specific Fields

```typescript
// ❌ Re-renders on every field change
const formValues = watch();

// ✅ Re-renders only when these fields change
const [username, email] = watch(['username', 'email']);
```

---

## Component Re-initialization

```typescript
// ❌ New component definition each render → unmounts and remounts every time
export const Parent: React.FC = () => {
  const Child = () => <div>Child</div>;
  return <Child />;
};

// ✅ Define outside the parent
const Child: React.FC = () => <div>Child</div>;

export const Parent: React.FC = () => <Child />;
```

---

## Checklist

| | Rule |
|-|------|
| ✅ | `useMemo` for filter / sort / transform on large arrays |
| ✅ | `useCallback` for functions passed as props or used in effect deps |
| ✅ | `React.memo` for expensive or frequently-rendered components |
| ✅ | Debounce search queries (300–500ms) |
| ✅ | Cleanup intervals, timeouts, and event listeners in `useEffect` |
| ✅ | Watch specific form fields, not the whole form |
| ✅ | Never define components inside another component body |