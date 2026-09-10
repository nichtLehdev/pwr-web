# UI Components

This directory contains reusable UI components that provide consistent styling throughout the application.

## Components

### Button

A versatile button component with multiple variants and sizes.

```tsx
import { Button } from "@/app/_components/ui";

// Primary button (default)
<Button>Click me</Button>

// Secondary button
<Button variant="secondary">Cancel</Button>

// Danger button
<Button variant="danger">Delete</Button>

// Success button
<Button variant="success">Save</Button>

// Ghost button
<Button variant="ghost">Ghost</Button>

// Outline button
<Button variant="outline">Outline</Button>

// Link button
<Button variant="link">Link</Button>

// Different sizes
<Button size="sm">Small</Button>
<Button size="md">Medium (default)</Button>
<Button size="lg">Large</Button>
<Button size="icon" aria-label="Icon button">
  <Icon />
</Button>

// Loading state
<Button isLoading>Loading...</Button>

// Disabled state
<Button disabled>Disabled</Button>
```

### Input

A styled text input component.

```tsx
import { Input } from "@/app/_components/ui";

<Input type="text" placeholder="Enter text..." />
<Input type="email" placeholder="Email" />
<Input type="password" placeholder="Password" />
<Input error placeholder="Error state" />
```

### Textarea

A styled textarea component.

```tsx
import { Textarea } from "@/app/_components/ui";

<Textarea placeholder="Enter text..." rows={4} />
<Textarea error placeholder="Error state" />
```

### Label

A styled label component with optional required indicator.

```tsx
import { Label } from "@/app/_components/ui";

<Label htmlFor="email">Email</Label>
<Label htmlFor="name" required>Name *</Label>
```

### Select

A styled select dropdown component.

```tsx
import { Select } from "@/app/_components/ui";

<Select>
  <option value="">Choose...</option>
  <option value="1">Option 1</option>
  <option value="2">Option 2</option>
</Select>
<Select error>
  <option value="">Choose...</option>
</Select>
```

### Checkbox

A styled checkbox component.

```tsx
import { Checkbox } from "@/app/_components/ui";

<Checkbox id="agree" />
<Checkbox id="terms" error />
```

### Card

A card container component with sub-components.

```tsx
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/app/_components/ui";

<Card>
  <CardHeader>
    <CardTitle>Card Title</CardTitle>
    <CardDescription>Card description</CardDescription>
  </CardHeader>
  <CardContent>
    <p>Card content goes here</p>
  </CardContent>
  <CardFooter>
    <Button>Action</Button>
  </CardFooter>
</Card>

// Variants
<Card variant="outline">Outline card</Card>
<Card variant="elevated">Elevated card</Card>
```

### Badge

A badge/tag component for labels and status indicators.

```tsx
import { Badge } from "@/app/_components/ui";

<Badge>Default</Badge>
<Badge variant="primary">Primary</Badge>
<Badge variant="success">Success</Badge>
<Badge variant="danger">Danger</Badge>
<Badge variant="warning">Warning</Badge>
<Badge variant="outline">Outline</Badge>

// Sizes
<Badge size="sm">Small</Badge>
<Badge size="md">Medium</Badge>
<Badge size="lg">Large</Badge>
```

### Alert

An alert component for displaying messages.

```tsx
import { Alert, AlertTitle, AlertDescription } from "@/app/_components/ui";

<Alert variant="info">
  <AlertTitle>Info</AlertTitle>
  <AlertDescription>This is an info message</AlertDescription>
</Alert>

<Alert variant="success">
  <AlertTitle>Success</AlertTitle>
  <AlertDescription>Operation completed successfully</AlertDescription>
</Alert>

<Alert variant="error">
  <AlertTitle>Error</AlertTitle>
  <AlertDescription>Something went wrong</AlertDescription>
</Alert>

<Alert variant="warning">
  <AlertTitle>Warning</AlertTitle>
  <AlertDescription>Please be careful</AlertDescription>
</Alert>
```

### DataTable

A sortable, filterable table built on TanStack Table v9. Every dashboard list
uses it, so sorting and filtering behave the same everywhere.

Each column header carries a sort button (shift-click adds a second sort key)
and a funnel that opens a filter menu. `Spalten` in the toolbar shows and hides
columns; the search box filters across all columns at once.

```tsx
import {
  DataTable,
  createDataTableColumnHelper,
  type DataTableColumn,
} from "@/app/_components/ui/data-table";

type Person = { id: string; name: string; city: string; joined: Date };

// Module scope: the helper and the feature set must not be re-created per render.
const column = createDataTableColumnHelper<Person>();

function People({ people }: { people: Person[] | undefined }) {
  const columns = useMemo<DataTableColumn<Person>[]>(
    () =>
      column.columns([
        column.accessor((person) => person.name, {
          id: "name",
          header: "Name",
          meta: { alwaysVisible: true },
          cell: ({ row }) => <Link href={...}>{row.original.name}</Link>,
        }),
        column.accessor((person) => person.city, {
          id: "city",
          header: "Ort",
          meta: { filterVariant: "set" },
        }),
        column.accessor((person) => person.joined, {
          id: "joined",
          header: "Dabei seit",
          sortFn: "datetime",
          meta: { filterVariant: "date", align: "right" },
          cell: ({ getValue }) => getValue().toLocaleDateString("de-DE"),
        }),
      ]),
    [],
  );

  return (
    <DataTable
      data={people}
      columns={columns}
      getRowId={(person) => person.id}
      rowNoun={["Person", "Personen"]}
    />
  );
}
```

**Column `meta`**

| Key             | Effect                                                           |
| --------------- | ---------------------------------------------------------------- |
| `filterVariant` | `text` (default), `set` (checkbox list), `number`, `date`        |
| `filterOptions` | Fixed `{value,label}` list for a `set` filter — needed for enums |
| `align`         | `left` (default), `center`, `right`                              |
| `label`         | Name in the column menu when `header` is not a plain string      |
| `alwaysVisible` | Keeps the column out of the show/hide menu                       |
| `cellClassName` | Extra classes on every `<td>` of the column                      |

Use `enableColumnFilter: false` for columns that cannot be filtered sensibly,
and `enableSorting: false` for derived columns the server cannot order by.

**Server-side lists.** A list that arrives one page at a time cannot sort or
filter in the browser without silently limiting itself to the current page. Pass
the state, its setter and the matching `manual*` flag, and turn them into query
input:

```tsx
<DataTable
  data={data?.rows}
  columns={columns}
  sorting={sorting}
  onSortingChange={setSorting}
  manualSorting
  columnFilters={columnFilters}
  onColumnFiltersChange={setColumnFilters}
  manualFiltering
  search={search}
  onSearchChange={setSearch}
  pagination={pagination}
  onPaginationChange={setPagination}
  manualPagination
  rowCount={data?.total ?? 0}
/>
```

Only the columns the server can order by should stay sortable, and only the
columns it can filter should keep their funnel — a control that silently does
nothing is worse than no control.

**Wide tables on phones.** Pass `renderMobileRow` to replace the table with a
stacked card below `md`; the toolbar and pager stay. Without it the table
scrolls horizontally, which is fine up to about five columns.

## Form Example

```tsx
import {
  Button,
  Input,
  Label,
  Textarea,
  Select,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/app/_components/ui";

function MyForm() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Account</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-4">
          <div>
            <Label htmlFor="name" required>
              Name
            </Label>
            <Input id="name" type="text" placeholder="Enter your name" />
          </div>

          <div>
            <Label htmlFor="email" required>
              Email
            </Label>
            <Input id="email" type="email" placeholder="Enter your email" />
          </div>

          <div>
            <Label htmlFor="country">Country</Label>
            <Select id="country">
              <option value="">Select a country</option>
              <option value="de">Germany</option>
              <option value="us">United States</option>
            </Select>
          </div>

          <div>
            <Label htmlFor="message">Message</Label>
            <Textarea id="message" placeholder="Enter your message" rows={4} />
          </div>

          <div className="flex gap-2">
            <Button type="submit">Submit</Button>
            <Button type="button" variant="secondary">
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
```

## Styling

All components use Tailwind CSS and support dark mode automatically. They follow the design system defined in `src/styles/globals.css` with:

- Primary color: `#faa619`
- Dark mode support
- Consistent spacing and typography
- Accessible focus states

## Accessibility

All components are built with accessibility in mind:

- Proper ARIA attributes
- Keyboard navigation support
- Focus indicators
- Semantic HTML elements
