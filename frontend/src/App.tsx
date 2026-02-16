import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeContext, useThemeProvider } from './hooks/useTheme';
import Shell from './components/layout/Shell';
import HomePage from './pages/HomePage';
import AnalysisPage from './pages/AnalysisPage';
import NotFoundPage from './pages/NotFoundPage';

export default function App() {
  const themeCtx = useThemeProvider();

  return (
    <ThemeContext.Provider value={themeCtx}>
      <BrowserRouter>
        <Shell>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/analysis/:taskId" element={<AnalysisPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Shell>
      </BrowserRouter>
    </ThemeContext.Provider>
  );
}
