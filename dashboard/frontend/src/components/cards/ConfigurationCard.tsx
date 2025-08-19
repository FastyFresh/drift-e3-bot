import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
  TextField,
  Alert,
  IconButton,
  Tooltip,
} from '@mui/material';
import { Settings, Refresh, Save } from '@mui/icons-material';
import { ConfigFile, StrategyConfig } from '../../types';
import ApiService from '../../services/api';

interface ConfigurationCardProps {
  onRefresh: () => void;
}

const ConfigurationCard: React.FC<ConfigurationCardProps> = ({ onRefresh }) => {
  const [configFiles, setConfigFiles] = useState<ConfigFile[]>([]);
  const [selectedConfig, setSelectedConfig] = useState<string>('');
  const [currentConfig, setCurrentConfig] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadConfigFiles();
  }, []);

  const loadConfigFiles = async () => {
    try {
      const files = await ApiService.getConfigFiles();
      setConfigFiles(files);
      
      // Auto-select optimal config if available
      const optimalConfig = files.find(f => f.filename === 'optimal-e3-explosive.json');
      if (optimalConfig) {
        setSelectedConfig(optimalConfig.filename);
        loadConfig(optimalConfig.filename);
      }
    } catch (err) {
      setError('Failed to load configuration files');
    }
  };

  const loadConfig = async (filename: string) => {
    try {
      setLoading(true);
      const config = await ApiService.getConfig(filename);
      setCurrentConfig(config);
      setError(null);
    } catch (err) {
      setError('Failed to load configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleConfigChange = (filename: string) => {
    setSelectedConfig(filename);
    if (filename) {
      loadConfig(filename);
    }
  };

  const handleParameterChange = (param: string, value: string) => {
    if (currentConfig?.parameters) {
      setCurrentConfig({
        ...currentConfig,
        parameters: {
          ...currentConfig.parameters,
          [param]: parseFloat(value) || 0
        }
      });
    }
  };

  const handleSave = async () => {
    if (!selectedConfig || !currentConfig) return;

    try {
      setLoading(true);
      await ApiService.saveConfig(selectedConfig, currentConfig);
      setSuccess('Configuration saved successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Failed to save configuration');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6" component="div" sx={{ display: 'flex', alignItems: 'center' }}>
            <Settings sx={{ mr: 1, color: 'primary.main' }} />
            Strategy Configuration
          </Typography>
          <Tooltip title="Refresh">
            <IconButton onClick={loadConfigFiles} size="small">
              <Refresh />
            </IconButton>
          </Tooltip>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
            {success}
          </Alert>
        )}

        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel>Configuration File</InputLabel>
          <Select
            value={selectedConfig}
            onChange={(e) => handleConfigChange(e.target.value)}
            label="Configuration File"
          >
            {configFiles.map((file) => (
              <MenuItem key={file.filename} value={file.filename}>
                {file.name} - {file.description}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {currentConfig?.parameters && (
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Strategy Parameters
            </Typography>
            <Grid container spacing={2}>
              {Object.entries(currentConfig.parameters).map(([key, value]) => (
                <Grid item xs={6} key={key}>
                  <TextField
                    fullWidth
                    size="small"
                    label={key}
                    value={value}
                    onChange={(e) => handleParameterChange(key, e.target.value)}
                    type="number"
                    inputProps={{ step: 'any' }}
                  />
                </Grid>
              ))}
            </Grid>

            <Box mt={2} display="flex" justifyContent="space-between">
              <Button
                variant="outlined"
                onClick={() => loadConfig(selectedConfig)}
                disabled={loading}
              >
                Reset
              </Button>
              <Button
                variant="contained"
                onClick={handleSave}
                disabled={loading}
                startIcon={<Save />}
              >
                Save Configuration
              </Button>
            </Box>
          </Box>
        )}

        {currentConfig?.optimizationResults && (
          <Box mt={2} p={2} bgcolor="background.paper" borderRadius={1}>
            <Typography variant="subtitle2" gutterBottom>
              Optimization Results
            </Typography>
            <Typography variant="body2" color="text.secondary">
              PnL: ${currentConfig.optimizationResults.pnl}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Trades: {currentConfig.optimizationResults.trades}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Sharpe: {currentConfig.optimizationResults.sharpe}
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default ConfigurationCard;
