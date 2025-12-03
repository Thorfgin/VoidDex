import { render } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

/**
 * Renders a component wrapped in a MemoryRouter with a specific route and state.
 * Handles paths with query parameters correctly by splitting pathname and search.
 */
export const renderWithRouter = (
  component: React.ReactElement,
  path: string = '/',
  state: any = null
) => {
  const [pathname, search] = path.split('?');
  
  const initialEntry = {
    pathname: pathname,
    search: search ? `?${search}` : '',
    state: state
  };

  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path={pathname} element={component} />
        {pathname !== '/' && <Route path="/" element={<div>Dashboard</div>} />}
      </Routes>
    </MemoryRouter>
  );
};
