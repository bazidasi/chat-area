import { Menu, type MenuProps } from '@mui/material'
import 'katex/dist/katex.min.css'
import { alpha, styled } from '@mui/material/styles'
import { useLanguage } from '@/stores/settingsStore'
import { isRTL } from '@/i18n/locales'

const StyledMenu = styled((props: MenuProps) => {
  const language = useLanguage()
  return (
    <Menu
      dir={isRTL(language) ? 'rtl' : 'ltr'}
      elevation={0}
      anchorOrigin={{
        vertical: 'bottom',
        horizontal: 'right',
      }}
      transformOrigin={{
        vertical: 'top',
        horizontal: 'right',
      }}
      PopoverClasses={{
        root: '',
        paper: '',
      }}
      {...props}
    />
  )
})(({ theme }) => ({
  '& .MuiPaper-root': {
    backgroundColor: theme.palette.mode === 'dark' ? theme.palette.grey[800] : theme.palette.grey[100],
    borderRadius: 6,
    marginTop: theme.spacing(1),
    minWidth: 140,
    color: theme.palette.mode === 'light' ? 'rgb(55, 65, 81)' : theme.palette.grey[300],
    boxShadow: 'var(--neo-shadow-outset-sm)',
    '& .MuiMenu-list': {
      padding: '0px 0',
    },
    '& .MuiMenuItem-root': {
      padding: '8px',
      '& .MuiSvgIcon-root': {
        color: theme.palette.text.secondary,
        marginRight: theme.spacing(1.5),
      },
      '&:active': {
        backgroundColor: alpha(theme.palette.primary.main, theme.palette.action.selectedOpacity),
      },
    },
    '& hr': {
      margin: '2px 0',
    },
  },
  '& .MuiPaper-root::-webkit-scrollbar': {
    width: '6px',
  },
  '& .MuiPaper-root::-webkit-scrollbar-track': {
    background: 'transparent',
  },
  '& .MuiPaper-root::-webkit-scrollbar-thumb': {
    backgroundColor: theme.palette.mode === 'light' ? '#0000001a' : '#ffffff1a',
    borderRadius: '4px',
  },
  '& .MuiPaper-root::-webkit-scrollbar-thumb:hover': {
    backgroundColor: theme.palette.mode === 'light' ? '#0000003a' : '#ffffff3a',
  },
}))

export default StyledMenu
