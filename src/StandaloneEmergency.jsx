import React from 'react';
import ReactDOM from 'react-dom/client';
import { createClient } from '@supabase/supabase-js';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { 
  CssBaseline, 
  Box, 
  Typography, 
  Button, 
  Paper, 
  CircularProgress,
  AppBar,
  Toolbar,
  Container,
  Card,
  CardContent,
  CardActions,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Grid
} from '@mui/material';

// Initialize Supabase directly
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Create a theme
const theme = createTheme({
  palette: {
    primary: {
      main: '#8b0000', // Maroon
    },
    secondary: {
      main: '#2196f3', // Blue
    },
  },
  typography: {
    h1: {
      fontSize: '2.5rem',
      fontWeight: 600,
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 600,
    },
    h3: {
      fontSize: '1.75rem',
      fontWeight: 600,
    },
    h4: {
      fontSize: '1.5rem',
      fontWeight: 600,
    },
  },
});

// Standalone Emergency App
const StandaloneEmergency = () => {
  const [loading, setLoading] = React.useState(false);
  const [matches, setMatches] = React.useState([]);
  const [selectedView, setSelectedView] = React.useState('home');
  const [sports, setSports] = React.useState([]);
  
  // Fetch sports on mount
  React.useEffect(() => {
    const fetchSports = async () => {
      try {
        const { data, error } = await supabase.from('sports').select('*');
        if (error) throw error;
        setSports(data || []);
      } catch (error) {
        console.error('Error fetching sports:', error);
      }
    };
    
    fetchSports();
  }, []);
  
  // Get match data directly
  const fetchMatches = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('matches')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      setMatches(data || []);
    } catch (error) {
      console.error('Error fetching matches:', error);
    } finally {
      setLoading(false);
    }
  };

  // Home View
  const HomeView = () => (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Typography variant="h1" gutterBottom>
        Sportea Emergency Access
      </Typography>
      
      <Typography variant="body1" sx={{ mb: 4 }}>
        This is a standalone emergency access mode that bypasses the normal app flow.
        Use this to access core functionality when the main app is having issues.
      </Typography>
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h3" gutterBottom>
                Browse Matches
              </Typography>
              <Typography variant="body1">
                View recent matches and join existing sports activities
              </Typography>
            </CardContent>
            <CardActions>
              <Button 
                size="large" 
                variant="contained"
                onClick={() => {
                  fetchMatches();
                  setSelectedView('matches');
                }}
              >
                View Matches
              </Button>
            </CardActions>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h3" gutterBottom>
                Create Match
              </Typography>
              <Typography variant="body1">
                Host a new sports match and invite others to join
              </Typography>
            </CardContent>
            <CardActions>
              <Button 
                size="large" 
                variant="contained" 
                color="secondary"
                onClick={() => setSelectedView('create')}
              >
                Create Match
              </Button>
            </CardActions>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
  
  // Matches View
  const MatchesView = () => (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h2">Recent Matches</Typography>
        <Button 
          variant="outlined" 
          onClick={() => setSelectedView('home')}
        >
          Back to Home
        </Button>
      </Box>
      
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      ) : matches.length === 0 ? (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="h3">No matches found</Typography>
          <Typography variant="body1" sx={{ mt: 2 }}>
            There are no recent matches to display. Try creating a new match.
          </Typography>
          <Button 
            variant="contained" 
            color="secondary" 
            sx={{ mt: 2 }}
            onClick={() => setSelectedView('create')}
          >
            Create Match
          </Button>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {matches.map(match => (
            <Grid item xs={12} md={6} key={match.id}>
              <Card>
                <CardContent>
                  <Typography variant="h3">{match.title}</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {match.description}
                  </Typography>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">
                      <strong>Sport:</strong> {match.sport}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Location:</strong> {match.location_name}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2">
                      <strong>Participants:</strong> {match.current_participants || 0}/{match.max_participants}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Date:</strong> {new Date(match.date).toLocaleDateString()}
                    </Typography>
                  </Box>
                </CardContent>
                <CardActions>
                  <Button size="small">View Details</Button>
                  <Button size="small" variant="contained">Join Match</Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Container>
  );
  
  // Create Match View
  const CreateMatchView = () => {
    const [matchData, setMatchData] = React.useState({
      title: '',
      description: '',
      sport: '',
      location_name: '',
      date: '',
      time: '',
      duration_minutes: 60,
      max_participants: 10,
      min_participants: 2,
      is_private: false
    });
    
    const [creating, setCreating] = React.useState(false);
    
    const handleChange = (e) => {
      const { name, value } = e.target;
      setMatchData(prev => ({ ...prev, [name]: value }));
    };
    
    const handleSubmit = async (e) => {
      e.preventDefault();
      setCreating(true);
      
      try {
        // Format data for Supabase
        const formattedData = {
          ...matchData,
          date: new Date(matchData.date + 'T' + matchData.time).toISOString(),
          duration_minutes: parseInt(matchData.duration_minutes),
          max_participants: parseInt(matchData.max_participants),
          min_participants: parseInt(matchData.min_participants),
          is_private: matchData.is_private === 'true'
        };
        
        delete formattedData.time;
        
        console.log('Creating match with data:', formattedData);
        
        const { data, error } = await supabase
          .from('matches')
          .insert([formattedData])
          .select();
        
        if (error) throw error;
        
        console.log('Match created successfully:', data);
        alert('Match created successfully!');
        
        // Go to matches view
        fetchMatches();
        setSelectedView('matches');
      } catch (error) {
        console.error('Error creating match:', error);
        alert('Error creating match: ' + error.message);
      } finally {
        setCreating(false);
      }
    };
    
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h2">Create New Match</Typography>
          <Button 
            variant="outlined" 
            onClick={() => setSelectedView('home')}
          >
            Back to Home
          </Button>
        </Box>
        
        <Paper sx={{ p: 3 }}>
          <Box component="form" onSubmit={handleSubmit}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <TextField
                  required
                  fullWidth
                  label="Match Title"
                  name="title"
                  value={matchData.title}
                  onChange={handleChange}
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Description"
                  name="description"
                  multiline
                  rows={3}
                  value={matchData.description}
                  onChange={handleChange}
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <FormControl fullWidth required>
                  <InputLabel>Sport</InputLabel>
                  <Select
                    name="sport"
                    value={matchData.sport}
                    label="Sport"
                    onChange={handleChange}
                  >
                    {sports.map(sport => (
                      <MenuItem key={sport.id} value={sport.name}>
                        {sport.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  required
                  fullWidth
                  label="Location"
                  name="location_name"
                  value={matchData.location_name}
                  onChange={handleChange}
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  required
                  fullWidth
                  label="Date"
                  name="date"
                  type="date"
                  value={matchData.date}
                  onChange={handleChange}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  required
                  fullWidth
                  label="Time"
                  name="time"
                  type="time"
                  value={matchData.time}
                  onChange={handleChange}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              
              <Grid item xs={12} md={4}>
                <TextField
                  required
                  fullWidth
                  label="Duration (minutes)"
                  name="duration_minutes"
                  type="number"
                  value={matchData.duration_minutes}
                  onChange={handleChange}
                />
              </Grid>
              
              <Grid item xs={12} md={4}>
                <TextField
                  required
                  fullWidth
                  label="Max Participants"
                  name="max_participants"
                  type="number"
                  value={matchData.max_participants}
                  onChange={handleChange}
                />
              </Grid>
              
              <Grid item xs={12} md={4}>
                <TextField
                  required
                  fullWidth
                  label="Min Participants"
                  name="min_participants"
                  type="number"
                  value={matchData.min_participants}
                  onChange={handleChange}
                />
              </Grid>
              
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Private Match</InputLabel>
                  <Select
                    name="is_private"
                    value={matchData.is_private}
                    label="Private Match"
                    onChange={handleChange}
                  >
                    <MenuItem value={false}>Public</MenuItem>
                    <MenuItem value={true}>Private</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12}>
                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  size="large"
                  fullWidth
                  disabled={creating}
                >
                  {creating ? <CircularProgress size={24} /> : 'Create Match'}
                </Button>
              </Grid>
            </Grid>
          </Box>
        </Paper>
      </Container>
    );
  };
  
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Sportea Emergency Access
          </Typography>
          <Button color="inherit" onClick={() => setSelectedView('home')}>
            Home
          </Button>
          <Button color="inherit" onClick={() => setSelectedView('matches')}>
            Matches
          </Button>
          <Button color="inherit" onClick={() => setSelectedView('create')}>
            Create
          </Button>
        </Toolbar>
      </AppBar>
      
      <Box component="main">
        {selectedView === 'home' && <HomeView />}
        {selectedView === 'matches' && <MatchesView />}
        {selectedView === 'create' && <CreateMatchView />}
      </Box>
    </ThemeProvider>
  );
};

// Mount standalone app
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<StandaloneEmergency />);

export default StandaloneEmergency;
