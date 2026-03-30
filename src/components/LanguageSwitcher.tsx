import { useLanguage } from '@/i18n/LanguageContext';
import { Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const LanguageSwitcher = () => {
  const { language, setLanguage } = useLanguage();

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setLanguage(language === 'en' ? 'tr' : 'en')}
      className="gap-1.5"
    >
      <Globe className="h-4 w-4" />
      {language === 'en' ? 'TR' : 'EN'}
    </Button>
  );
};
